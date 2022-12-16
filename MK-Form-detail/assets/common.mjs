// Common Utilities Class
export default class {
    constructor(contentClient, noPermissionToView) {
        this.contentClient = contentClient;
        this.noPermissionToView = noPermissionToView || "You do not have permission to view this asset";
        this.libs = this.contentClient.getLibs() || {};

        this.marked = this.libs.marked || window.marked;
    }

    // Helper method to make an additional Content REST API call to retrieve all items referenced in the data by their ID.
    getRefItems(ids) {
        // Calling getItems() with no ‘ids’ returns all items.
        // If no items are requested, just return a resolved Promise.
        if (ids.length === 0) {
            return Promise.resolve({});
        } else {
            return this.contentClient.getItems({
                "ids": ids
            });
        }
    }

    //
    // Helper Methods to handle specific field types
    //

    findReferenceFieldIds(referencedItems, fields) {
        const referencedIds = [];

        referencedItems.forEach((referencedItem) => {
            if (fields[referencedItem]) {

                // handle multiple or single value content fields
                (Array.isArray(fields[referencedItem]) ? fields[referencedItem] : [fields[referencedItem]]).forEach((entry) => {
                    if (entry) {
                        // if asset is accessible, add it
                        if (!entry.reference || entry.reference.isAccessible) {
                            referencedIds.push(entry.id);
                        } else {
                            // asset is not accessible, store the message against the entry
                            entry.referenceInaccessible = this.noPermissionToView;
                        }
                    }
                });
            }
        });

        return referencedIds;
    }

    updateDigitalAssetURLs(digitalAssetFields, fields) {
        digitalAssetFields.forEach((digitalAssetField) => {
            if (fields[digitalAssetField]) {

                // handle multiple or single value content fields
                (Array.isArray(fields[digitalAssetField]) ? fields[digitalAssetField] : [fields[digitalAssetField]]).forEach((entry) => {
                    if (entry) {
                        if (!entry.reference || entry.reference.isAccessible) {
                            if (entry.type === "Video" || entry.type === "File") {
                                entry.showName = true;
                            } else {
                                entry.url = this.contentClient.getRenditionURL({
                                    "id": entry.id
                                });
                            }
                        } else {
                            // asset is not accessible, store the message against the entry
                            entry.referenceInaccessible = this.noPermissionToView;
                        }
                    }
                });
            }
        });
    }

    updateMarkdownFields(markdownFields, fields) {
        const parseMarkdown = (mdText) => {
            if (mdText && /^<!---mde-->\n\r/i.test(mdText)) {
                mdText = mdText.replace("<!---mde-->\n\r", "");

                mdText = this.marked(mdText);
            }

            return mdText;
        };

        markdownFields.forEach((markdownField) => {
            if (fields[markdownField]) {

                // handle multiple or single value content fields
                if (Array.isArray(fields[markdownField])) {
                    fields[markdownField] = fields[markdownField].map((entry) => {
                        return parseMarkdown(this.contentClient.expandMacros(entry));
                    });
                } else {
                    fields[markdownField] = parseMarkdown(this.contentClient.expandMacros(fields[markdownField]));
                }
            }
        });
    }

    updateRichTextFields(richTextFields, fields) {
        richTextFields.forEach((richTextField) => {
            if (fields[richTextField]) {

                // handle multiple or single value content fields
                if (Array.isArray(fields[richTextField])) {
                    fields[richTextField] = fields[richTextField].map((entry) => {
                        return this.contentClient.expandMacros(entry);
                    });
                } else {
                    fields[richTextField] = this.contentClient.expandMacros(fields[richTextField]);
                }
            }
        });
    }

    updateDateTimeFields(dateTimeFields, fields) {
        const dateToMDY = (date) => {
            if (!date) {
                return "";
            }

            const dateObj = new Date(date);

            const options = {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            };
            const formattedDate = dateObj.toLocaleDateString("en-US", options);

            return formattedDate;
        }

        dateTimeFields.forEach((dateTimeField) => {
            if (fields[dateTimeField]) {

                // handle multiple or single value content fields
                if (Array.isArray(fields[dateTimeField])) {
                    fields[dateTimeField] = fields[dateTimeField].map((entry) => {
                        return entry.formatted = dateToMDY(entry.value);
                    });
                } else {
                    fields[dateTimeField].formatted = dateToMDY(fields[dateTimeField].value);
                }
            }
        });
    }

    addReferencedItems(referencedItems, results, fields) {
        (results && results.items || []).forEach((item) => {
            referencedItems.forEach((referencedItem) => {
                (Array.isArray(fields[referencedItem]) ? fields[referencedItem] : [fields[referencedItem]]).forEach((entry) => {
                    // Retrieve the reference item from the query result.
                    if (entry && entry.id === item.id) {
                        entry.contentItem = item;

                        // add in assetURLs for any digital asset references in the referenced item
                        const digitalAssetFields = Object.keys(item.fields).filter((key) => {
                            const field = item.fields[key];
                            return field && (typeof field === 'object') && (field.typeCategory === 'DigitalAssetType');
                        });
                        this.updateDigitalAssetURLs(digitalAssetFields, item.fields) 
                    }
                });
            });
        });
    }
}