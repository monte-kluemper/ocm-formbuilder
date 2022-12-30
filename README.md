# ocm-formbuilder


This is a sample to show how customers can easily add a form-builder tool to Oracle Content.  For this sample, I am using the Form Builder package here:  https://www.npmjs.com/package/formBuilder.

First, let me show what a finished form might look like on a Site Builder page.
<img src="Cafe%20Supremo%20Coffee%20Club%2016x9.png" width="50%" height="50%">

The form definitions are stored in Oracle Content as any other asset.  This requires an asset type with the following fields:  Form Definition (JSON), URL (Text), Response (Text) and Form HTML (Long Text).

There are 2 components to the solution:
1. Form-Builder - This is a custom contribution form associated with the form asset type.
2. Form-detail - This is a content layout associated with the form asset type.

## Form-Builder - Custom Contribution Form

The form builder is where we will craft the graphical form-building experience.  Here is an example of the finished form.
<img src="Custom%20Form.png" width="50%" height="50%">



## Form-detail - Content Layout

The form detail is where we will design the form presentation and styling.  It also includes the logic to send the form submissions to external services.  Once a new form is created, it can be immediately previewed by business users like this:
<img src="Form%20Preview.png" width="50%" height="50%">


## Site Builder

To create a new form from a Site Builder page, users can drop a "Content Item" component onto the page, then click on "Settings" to select a form.  On the selection window, users will also see the option to create new assets, including new forms.  Once the new form is created, it can be selected and will be shown on the page as so:

<img src="Cafe%20Supremo%20Coffee%20Club%20Editor.png" width="50%" height="50%">

If analytics is turned on for the site, accessing the form will feed into the built-in analytics and will be available on the form in the Assets panel of the Oracle Content Web UI.

<img src="Form%20Analytics.png" width="50%" height="50%">

