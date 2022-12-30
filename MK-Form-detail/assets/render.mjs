
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
						var contentName = this.content.name;
						formObj.addEventListener('submit', function (e) {
							e.preventDefault();
							if( typeof SCSRenderAPI != 'undefined' ) { SCSRenderAPI.recordAssetOperation(this.id, 'download'); }
							var form = e.currentTarget;

							var rest = form.action;
							var options = {};

							var action = form.action.split("/");

							// Format of action URL - "https://ocm/[RespositoryID]";
							if( action[2].toLowerCase() == "ocm" ) {
								var repo = action[3];
								if( !repo ) { repo = "B63CB6989A534C14A49F304834DE0BEF"; }

								var formData = new FormData(form);
								var formName = contentName;
								var name = "";
								var desc = "";
								var formFields = {};
								// Create JSON with form fields
								for (const entry of formData.entries()) {
									formFields[entry[0]] = entry[1];
									// Set name to first name field
									if(entry[0].toLowerCase().includes("name") && name=="" ) {
										name = entry[1].replace(/[^a-zA-Z0-9 \-]/g, '');
									}
									// Set description to first email field
									if(entry[0].toLowerCase().includes("email") && desc=="" ) {
										desc = entry[1];
									}
								}
								if(name=="") name = formName;
								//console.log("Fields:"+JSON.stringify(formFields));
	

								var createAssetPayload = {
									"name" : name,
									"type" : "FormData",
									"description" : desc,
									"repositoryId" : repo,
									"translatable" : "false",
									"fields" : {
										"form_name" : formName,
										"form_data" : formFields
									}
								};

								rest = "https://"+location.hostname+"/content/management/api/v1.1/items";

								// For anonymous forms, you will need to configure a user or app to create assets in OCM
								var auth = "Basic Zm9ybXVzZXI6V2VsY29tZTEyMzQ1";
								var cred = "omit";

								// If the form is for authenticated users only, you can use these values:
								//var auth = "Session";
								//var cred = "include";

								options = {
									method: 'POST',
									headers: {
										"Content-Type" : "application/json",
										"X-Requested-With" : "XMLHttpRequest",
										"Authorization" : auth
									},
									credentials: cred,
									body: JSON.stringify(createAssetPayload)
								}
								//console.log("Form Options = "+JSON.stringify(options));


							// Logic for Responsys
							} else if( action[2].toLowerCase() == "responsys" ) {
								var formData = new FormData(form);
								// Set REST URL for calling Responsys
								// Set Fetch Options
								// Set Campaign value in form data



							// Additional options can be configured here.
							}

							fetch(rest, options)
							.then(response => {
								console.log("Form response = "+response.formData.toString());
								if (!response.ok) {
									throw new Error('Network response was not OK');
								  }
							})
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