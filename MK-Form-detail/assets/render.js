/**
 * Confidential and Proprietary for Oracle Corporation
 *
 * This computer program contains valuable, confidential, and
 * proprietary information. Disclosure, use, or reproduction
 * without the written authorization of Oracle is prohibited.
 *
 * Copyright (c) 2021, Oracle and/or its affiliates.
 */
define(['require', 'mustache', 'jquery'], function (require, Mustache, $) {
	/**
	 * This is a generic AMD wrapper module for backwards compatibility. 
	 * It enables RequireJS dyanmic loading of JavaScript Module based custom components.
	 */
	function ContentLayout(params) {
		const moduleURL = require.toUrl('./render.mjs');

		// import the module file from the assets folder
		this.loadModule = import(moduleURL).then(({
			default: ModuleComponent
		}) => {
			// return a new instance of the component
			if (ModuleComponent) {
				// augment parameters with 3rd party libs
				const moduleParams = Object.assign({}, params);
				moduleParams.$ = params.$ || $;
				moduleParams.Mustache = params.Mustache || Mustache

				// create the new module component
				return Promise.resolve(new ModuleComponent(moduleParams));
			} else {
				return Promise.reject('Failed to load module: ' + moduleURL);
			}
		}).catch((e) => {
			// typically this will be caused by syntax errors in the render.mjs file
			// make sure the render.mjs file can be imported directly
			console.error(e);
		});
	}

	ContentLayout.prototype.contentVersion = ">=1.0.0 <2.0.0";

	ContentLayout.prototype.render = function (parentObj) {
		// wait for the actual module to load and then render it
		this.loadModule.then((module) => {
			module.render(parentObj);
		});
	};

	return ContentLayout;
});