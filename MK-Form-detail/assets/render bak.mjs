
/* globals Mustache */
import CommonUtils from './common.mjs';

export default class {
	// class variables
	contentVersion = ">=1.0.0 <2.0.0"

	// Content Layout constructor 
	constructor(params) {
		// store passed in values
		this.contentItemData = params.contentItemData || {};
		this.scsData = params.scsData;
		this.contentClient = params.contentClient;
		this.libs = this.contentClient.getLibs() || {};

		// store path to the "assets" folder
		this.assetsFolder = import.meta.url.replace('/render.mjs', '');

		// access resources
		this.Mustache = params.Mustache || this.libs.Mustache || window.Mustache;
	}

	// Main rendering function:
	// - Updates the data to handle any required additional requests and support granular permissions 
	// - Expand the Mustache template with the updated data
	// - Appends the expanded template HTML to the parentObj DOM element
	render(parentObj) {
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
		Promise.all([
			commonUtils.getRefItems(referedIds),
			contentClient.importText(this.assetsFolder + '/layout.html'),
			contentClient.importCSS(this.assetsFolder + '/design.css')
		]).then((resources) => {
			const results = resources[0];
			const templateHtml = resources[1];

			// Store the retrieved referenced items in the model used by the template.
			commonUtils.addReferencedItems(referedFields, results, this.content.fields);

			// apply the model to the template
			try {
				// Use Mustache to expand the HTML template with the data.
				const template = this.Mustache.render(templateHtml, this.content);

				// Insert the expanded template into the passed in container.
				if (template) {
					parentObj.insertAdjacentHTML('beforeend', template);
					var formObj = document.getElementById('myForm');
					if( formObj ) {
						formObj.addEventListener('submit', function (e) {
							e.preventDefault();
							var form = e.currentTarget;
							var formData = new FormData(form);
							console.log("Form Action = "+form.action);
							var formFields = {};
							for (const entry of formData.entries()) {
								formFields[entry[0]] = entry[1];
							}
							console.log("Fields:"+JSON.stringify(formFields));
							fetch(form.action, {
								method: 'post',
								body: formData
							})
						    .then(response => onSuccess(response, currentTarget))
    						.catch((error) => {
								console.error('Error:', error);
							});

							document.getElementById("form-container").style.display = 'none';
							document.getElementById("form-response").style.display = 'block';
						});
					}
				}
			} catch (e) {
				console.error(e.stack);
			}
		});
	}
}