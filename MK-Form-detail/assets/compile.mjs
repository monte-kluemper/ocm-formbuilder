import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CommonUtils from './common.mjs';
import Mustache from 'mustache';
import { marked } from 'marked';

export default class {
  // Content Layout compiler constructor 
  constructor(args) {
    // Store the context information
    this.contentClient = args.contentClient;
    this.contentItemData = args.contentItemData || {};
    this.scsData = args.scsData;
    this.SCSCompileAPI = args.scsData && args.scsData.SCSCompileAPI;

    // pass the libs through to the common code
    this.contentClient.getLibs = this.contentClient.getLibs || (() => {
      return {
        Mustache: Mustache,
        marked: marked
      };
    });

    // store path to the "assets" folder
    this.assetsFolder = fileURLToPath((import.meta.url).replace('compile.mjs', ''));
  }
  // Main rendering function:
  // - Updates the data to handle any required additional requests and support granular permissions 
  // - Expand the Mustache template with the updated data
  // - Returns a Promise that resolves to the compiled HTML to be inserted into the page
  compile() {
    return new Promise((resolve, reject) => {
      const contentClient = this.contentClient;
      const noPermissionToViewMsg = "You do not have permission to view this asset";
      const commonUtils = new CommonUtils(contentClient, noPermissionToViewMsg);

      let contentType;
      let customSettings;
      let secureContent = false;

      // extract the content that will be used as the model 
      this.content = Object.assign({}, this.contentItemData);

      // If used with CECS Sites, Sites will pass in context information via the scsData property.
      if (this.scsData) {
        this.content = Object.assign(this.content, {
          "scsData": this.scsData
        });
        contentType = this.content.scsData.showPublishedContent === true ? "published" : "draft";
        customSettings = this.content.scsData.customSettingsData || {};
      }


      //
      // Handle fields specific to this content type.
      //

      // If displaying detail items, get the IDs of any referenced assets
      // we will do an additional query to retrieve these so we can render them as well.
      const referedFields = [];
      const referedIds = commonUtils.findReferenceFieldIds(referedFields, this.content.fields);

      // Handle expansion of URLs and check permissions for access to referenced digital asset
      const digitalAssetFields = [];
      commonUtils.updateDigitalAssetURLs(digitalAssetFields, this.content.fields);

      // Handle markdown expansion
      const markDownFields = [];
      commonUtils.updateMarkdownFields(markDownFields, this.content.fields);

      // Handle richText expansion
      const richTextFields = [];
      commonUtils.updateRichTextFields(richTextFields, this.content.fields);

      // Handle date field formatting
      const dateTimeFields = ["expiration_date"];
      commonUtils.updateDateTimeFields(dateTimeFields, this.content.fields);

      //
      // Fetch any referenced items and resources used to render the content layout
      //
      commonUtils.getRefItems(referedIds).then((results) => {


        // Store the retrieved referenced items in the model used by the template.
        commonUtils.addReferencedItems(referedFields, results, this.content.fields);

        // apply the model to the template
        try {
          // Use Mustache to expand the HTML template with the data.
          const template = fs.readFileSync(path.join(this.assetsFolder, 'layout.html'), 'utf8');
          let componentHTML = Mustache.render(template, this.content);

          // add in any CSS style
          const designCssPath = path.join(this.assetsFolder, 'design.css');
          if (fs.existsSync(designCssPath)) {
            const designCss = fs.readFileSync(designCssPath, 'utf8');
            if (designCss) {
              componentHTML = '<style>' + designCss + '</style>' + componentHTML;
            }
          }


          // It is up to the developer to ensure the output from the compile.mjs:compile() function remains in sync with the render.mjs:render() function.
          // To see what the default output would be, switch the following to true
          if (false) {
            // return the generated HTML and use hydrate in the render.mjs file to add any event handlers at runtime
            // change hydreate to true to use hydrate in the render.mjs file to add any event handlers at runtime
            return resolve({
              hydrate: false,
              content: componentHTML
            });
          } else {
            // warn the user that the compile function hasn't been implemented
            console.log('Warning: the custom compile() function has not been implemented in: ' + import.meta.url);

            // If the compile() function doesn't return any content, then the component will execute dynamically at runtime
            return resolve({});
          }
        } catch (e) {
          console.log('Error: Failed to expand mustache template in: ' + import.meta.url, e);
          return reject();
        }
      });
    });
  }
}