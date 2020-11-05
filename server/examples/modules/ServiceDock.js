/*
Project Name: SPIKE Prime Web Interface
File name: ServiceDock_SystemLink.js
Author: Jeremy Jung
Last update: 7/19/20
Description: HTML Element definition for <service-systemlink> to be used in ServiceDocks
Credits/inspirations:
History:
    Created by Jeremy on 7/16/20
LICENSE: MIT
(C) Tufts Center for Engineering Education and Outreach (CEEO)
*/

// import { Service_SystemLink } from "./Service_SystemLink.js";

class servicesystemlink extends HTMLElement {   

    constructor () {

        super();

        this.active = false; // whether the service was activated
        this.service = new Service_SystemLink(); // instantiate a service object ( one object per button )
        this.proceed = false; // if there are credentials input

        // Create a shadow root
        var shadow = this.attachShadow({ mode: 'open' });

        /* wrapper definition and CSS */
        var wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'wrapper');
        wrapper.setAttribute("style", "width: 50px; height: 50px; position: relative; margin-top: 10px;")
        
        /* ServiceDock button definition and CSS */
        
        var button = document.createElement("button");
        button.setAttribute("id", "sl_button");
        button.setAttribute("class", "SD_button");
        
        /* CSS */
        var imageRelPath = "./modules/views/systemlinkIcon.png" // relative to the document in which a servicesystemlink is created ( NOT this file )
        var length = 50; // for width and height of button
        var backgroundColor = "#A2E1EF" // background color of the button
        var buttonStyle = "width:" + length + "px; height:" + length + "px; background: url(" + imageRelPath + ") no-repeat; background-size: 50px 50px; background-color:" + backgroundColor 
                + "; border: none; background-position: center; cursor: pointer; border-radius: 10px; position: relative; margin: 4px 0px; "
        button.setAttribute("style", buttonStyle);

        /* status circle definition and CSS */

        this.status = document.createElement("div");
        this.status.setAttribute("class", "status");
        
        /* CSS */
        var length = 20; // for width and height of circle
        var statusBackgroundColor = "red" // default background color of service (inactive color)
        var posLeft = 30;
        var posTop = 20;
        var statusStyle = "border-radius: 50%; height:" + length + "px; width:" + length + "px; background-color:" + statusBackgroundColor +
         "; position: relative; left:" + posLeft + "px; top:" + posTop + "px;";
        this.status.setAttribute("style", statusStyle);

        /* event listeners */

        button.addEventListener("mouseleave", function (event) {
            button.style.backgroundColor = "#A2E1EF";
            button.style.color = "#000000";
        });

        button.addEventListener("mouseenter", function(event){
            button.style.backgroundColor = "#FFFFFF";
            button.style.color = "#000000";
        })

        this.addEventListener("click", async function() {

            if ( !this.active ) {
                this.popUpBox();
            }

            // check active flag so once activated, the service doesnt reinit
            if ( !this.active && this.proceed) {
                
                console.log("activating service");
                
                var initSuccessful = await this.service.init(this.APIKey);
                
                if (initSuccessful) {
                    this.active = true;
                    this.status.style.backgroundColor = "green";
                }

            }

        });

        shadow.appendChild(wrapper);
        button.appendChild(this.status);
        wrapper.appendChild(button);
    }

    /* Ask user for API credentials */
    popUpBox() {
        var APIKeyExists = true;

        var APIKeyResult = prompt("Please enter your System Link Cloud API Key:", "daciN5xlHb-J_eABvDQPRIYt4jrKmbUbCl-Zc2vta7");
        // APIkey 
        if ( APIKeyResult == null || APIKeyResult == "" ) {
            console.log("You inserted no API key");
            APIKeyExists = false;
        }
        else {
            APIKeyExists = true;
            this.APIKey = APIKeyResult;
        }

        if ( APIKeyExists ) {
            this.proceed = true;
        }
    }

    /* for Service's API credentials */

    static get observedAttributes() {
        return ["apikey"];
    }

    get apikey() {
        return this.getAttribute("apikey");
    }

    set apikey(val) {
        console.log(val);
        if ( val ) {
            this.setAttribute("apikey", val);
        }
        else {
            this.removeAttribute("apikey");
        }
    }

    attributeChangedCallback (name, oldValue, newValue) {
        this.APIKey = newValue;
    }

    /* get the Service_SystemLink object */
    getService() {
        return this.service;
    }

    /* get whether the ServiceDock button was clicked */
    getClicked() {
        return this.active;
    }

    // initialize the service (is not used in this class but available for use publicly)
    async init() {
        var initSuccess = await this.service.init(this.APIKey);
        if (initSuccess) {
            this.status.style.backgroundColor = "green";
            this.active = true;
            return true;
        }
        else {
            return false;
        }
    }

}

// when defining custom element, the name must have at least one - dash 
window.customElements.define('service-systemlink', servicesystemlink);

/*
Project Name: SPIKE Prime Web Interface
File name: Service_SystemLink.js
Author: Jeremy Jung
Last update: 8/04/20
Description: SystemLink Service Library (OOP)
History:
    Created by Jeremy on 7/15/20
LICENSE: MIT
(C) Tufts Center for Engineering Education and Outreach (CEEO)
*/

/**
 * 
 * @class Service_SystemLink
 * @example
 * // if you're using ServiceDock
 * var mySL = document.getElemenyById("service_systemlink").getService();
 * mySL.setAttribute("apikey", "YOUR API KEY");
 * mySL.init();
 * 
 * // if you're not using ServiceDock
 * var mySL = new Service_SystemLink();
 * 
 * mySL.init(APIKEY);
 */
function Service_SystemLink() {

    //////////////////////////////////////////
    //                                      //
    //          Global Variables            //
    //                                      //
    //////////////////////////////////////////

    /* private members */

    let tagsInfo = {}; // contains real-time information of the tags in the cloud

    let APIKey = "API KEY";

    let serviceActive = false; // set to true when service goes through init

    let pollInterval = 1000;

    var funcAtInit = undefined; // function to call after init

    //////////////////////////////////////////
    //                                      //
    //           Public Functions           //
    //                                      //
    //////////////////////////////////////////

    /** initialize SystemLink_Service
     * <p> Starts polling the System Link cloud </p>
     * <p> <em> this function needs to be executed after executeAfterInit but before all other public functions </em> </p>
     * 
     * @public
     * @param {string} APIKeyInput SYstemlink APIkey
     * @param {integer} pollIntervalInput interval at which to get tags from the cloud in MILISECONDS
     * @returns {boolean} True if service was successsfully initialized, false otherwise
     * 
     */
    async function init(APIKeyInput, pollIntervalInput) {

        // if an APIKey was specified
        if (APIKeyInput !== undefined) {
            APIKey = APIKeyInput;
        }

        var response = await checkAPIKey(APIKey);

        // if response from checkAPIKey is valid
        if (response) {

            if (pollIntervalInput !== undefined) {
                pollInterval = await pollIntervalInput;
            }

            // initialize the tagsInfo global variable
            updateTagsInfo(function () {

                active = true;

                // call funcAtInit if defined
                if (funcAtInit !== undefined) {

                    funcAtInit();
                }
            });

            return true;
        }
        else {
            return false;
        }
    }

    /** Get the callback function to execute after service is initialized
     * <p> <em> This function needs to be executed before calling init() </em> </p>
     * 
     * @public
     * @param {function} callback function to execute after initialization
     * @example
     * mySL.executeAfterInit( function () {
     *     var tagsInfo = await getTagsInfo();
     * })
     */
    function executeAfterInit(callback) {
        // Assigns global variable funcAtInit a pointer to callback function
        funcAtInit = callback;
    }

    /** Return the tagsInfo global variable
     * 
     * @public
     * @returns basic information about currently existing tags in the cloud
     * @example
     * var tagsInfo = await mySL.getTagsInfo();
     * var astringValue = tagsInfo["astring"]["value"];
     * var astringType = tagsInfo["astring"]["type"];
     */
    async function getTagsInfo() {
        return tagsInfo;
    }

    /** Change the current value of a tag on SystemLink cloud
     * 
     * @public
     * @param {string} tagName 
     * @param {any} newValue 
     * @param {function} callback 
     */
    async function setTagValue(tagName, newValue, callback) {
        // changes the value of a tag on the cloud
        changeValue(tagName, newValue, function(valueChanged) {
            if (valueChanged) {
                typeof callback === 'function' && callback();
            }
        });
    }

    /** Get the current value of a tag on SystemLink cloud
     * 
     * @public
     * @param {string} tagName 
     * @returns {any} current value of tag
     */
    async function getTagValue(tagName) {

        var currentValue = tagsInfo[tagName].value;

        return currentValue;
    }

    /** Get whether the Service was initialized or not
     * 
     * @public
     * @returns {boolean} whether Service was initialized or not
     */
    function isActive() {
        return serviceActive;
    }

    /** Change the APIKey
     * @ignore
     * @param {string} APIKeyInput 
     */
    function setAPIKey(APIKeyInput) {
        // changes the global variable APIKey
        APIKey = APIKeyInput;
    }
    
    /** Create a new tag
     * 
     * @public
     * @param {string} tagName name of tag to create
     * @param {any} tagValue value to assign the tag after creation
     * @param {function} callback optional callback
     * @example
     * mySL.createTag("message", "hi", function () {
     *      mySL.setTagValue("message", "bye"); 
     * })
     */
    async function createTag(tagName, tagValue, callback) {
        
        // get the SystemLink formatted data type of tag
        var valueType = getValueType(tagValue);

        // create a tag with the name and data type. If tag exists, it still returns successful response
        createNewTagHelper(tagName, valueType, function (newTagCreated) {
            
            // after tag is created, assign a value to it
            changeValue(tagName, tagValue, function (newTagValueAssigned) {

                // execute callback if successful
                if (newTagCreated) {
                    if (newTagValueAssigned) {
                        typeof callback === 'function' && callback();
                    }
                }
            })
        })
    }

    /** Delete tag
     * 
     * @public
     * @param {string} tagName name of tag to delete
     * @param {function} callback optional callback
     */
    async function deleteTag(tagName, callback) {
        // delete the tag on System Link cloud
        deleteTagHelper(tagName, function (tagDeleted) {
            if ( tagDeleted ) {
                typeof callback === 'function' && callback();
            }
        });
    }

    //////////////////////////////////////////
    //                                      //
    //          Private Functions           //
    //                                      //
    //////////////////////////////////////////


    /** sleep function
     * 
     * @private
     * @param {integer} ms 
     * @returns {Promise}
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /** Check if Systemlink API key is valid for use
     * 
     * @private
     * @param {string} APIKeyInput 
     * @returns {Promise} resolve(true) or reject(error)
     */
    async function checkAPIKey(APIKeyInput) {
        return new Promise(async function (resolve, reject) {
            var apiKeyAuthURL = "https://api.systemlinkcloud.com/niauth/v1/auth";

            var request = await sendXMLHTTPRequest("GET", apiKeyAuthURL, APIKeyInput)

            request.onload = function () {

                var response = JSON.parse(request.response);

                if (response.error) {
                    reject(new Error("Error at apikey auth:", response));
                }
                else {
                    console.log("APIkey is valid")
                    resolve(true)
                }

            }

            request.onerror = function () {
                var response = JSON.parse(request.response);
                // console.log("Error at apikey auth:", request.response);
                reject(new Error("Error at apikey auth:", response));
            }
        })
    }

    /** Assign list of tags existing in the cloud to {tagPaths} global variable
     * 
     * @private
     * @param {function} callback 
     */
    async function updateTagsInfo(callback) {

        // get the tags the first time before running callback
        getTagsInfoFromCloud(function (collectedTagsInfo) {

            // if the collectedTagsInfo is defined and not boolean false
            if (collectedTagsInfo) {
                tagsInfo = collectedTagsInfo;
            }

            // after tagsInfo is initialized, begin the interval to update it
            setInterval(async function () {

                getTagsInfoFromCloud(function (collectedTagsInfo) {

                    // if the object is defined and not boolean false
                    if (collectedTagsInfo) {
                        tagsInfo = collectedTagsInfo;
                    }
                });

            }, pollInterval)

            // run the callback of updateTagsInfo inside init()
            callback();

        });

    }

    /** Get the info of a tag in the cloud
     * 
     * @private
     * @param {function} callback 
     */
    async function getTagsInfoFromCloud(callback) {

        // make a new promise
        new Promise(async function (resolve, reject) {

            var collectedTagsInfo = {}; // to return

            var getMultipleTagsURL = "https://api.systemlinkcloud.com/nitag/v2/tags-with-values";

            // send request to SystemLink API
            var request = await sendXMLHTTPRequest("GET", getMultipleTagsURL, APIKey);

            // when transaction is complete, parse response and update return value (collectedTagsInfo)
            request.onload = async function () {

                // parse response (string) into JSON object
                var responseJSON = JSON.parse(this.response)

                var tagsInfoArray = responseJSON.tagsWithValues;

                // get total number of tags
                var tagsAmount = responseJSON.totalCount;

                for (var i = 0; i < tagsAmount; i++) {

                    // parse information of the tags

                    try {
                        var value = tagsInfoArray[i].current.value.value;
                        var valueType = tagsInfoArray[i].current.value.type;
                        var tagName = tagsInfoArray[i].tag.path;

                        var valueToAdd = await getValueFromType(valueType, value);

                        // store tag information
                        var pathInfo = {};
                        pathInfo["value"] = valueToAdd;
                        pathInfo["type"] = valueType;

                        // add a tag info to the return object
                        collectedTagsInfo[tagName] = pathInfo;

                    }
                    // when value is not yet assigned to tag
                    catch (e) {
                        var value = null
                        var valueType = tagsInfoArray[i].tag.type;
                        var tagName = tagsInfoArray[i].tag.path;

                        // store tag information
                        var pathInfo = {};
                        pathInfo["value"] = value;
                        pathInfo["type"] = valueType;

                        // add a tag info to the return object
                        collectedTagsInfo[tagName] = pathInfo;
                    }
                }

                resolve(collectedTagsInfo)

            }
            request.onerror = function () {

                console.log(this.response);

                reject(false);

            }
        }).then(
            // success handler 
            function (resolve) {
                //run callback with resolve object
                callback(resolve);
            },
            // failure handler
            function (reject) {
                // run calllback with reject object
                callback(reject);
            }
        )
    }

    /** Send PUT request to SL cloud API and change the value of a tag
     * 
     * @private
     * @param {string} tagPath string of the name of the tag
     * @param {any} newValue value to assign tag
     * @param {function} callback
     */
    async function changeValue(tagPath, newValue, callback) {
        new Promise(async function (resolve, reject) {

            var URL = "https://api.systemlinkcloud.com/nitag/v2/tags/" + tagPath + "/values/current";

            var valueType = getValueType(newValue);

            // value is not a string
            if (valueType != "STRING") {
                // newValue will have no quotation marks before being stringified
                var stringifiedValue = JSON.stringify(newValue);

                var data = { "value": { "type": valueType, "value": stringifiedValue } };

            }
            // value is a string
            else {
                // newValue will already have quotation marks before being stringified, so don't stringify
                var data = { "value": { "type": valueType, "value": newValue } };
            }

            var requestBody = data;

            var request = await sendXMLHTTPRequest("PUT", URL, APIKey, requestBody);

            request.onload = function () {
                resolve(true);
            }

            request.onerror = function () {
                reject(false);
            }

            // catch error
            request.onreadystatechange = function () {
                if (this.readyState === XMLHttpRequest.DONE && (this.status != 200) ) {
                    console.log(this.status + " Error at changeValue: ", this.response)
                }
            }


        }).then(
            // success handler
            function (resolve) {
                callback(resolve);
            },
            function (reject) {
                callback(reject);
            }
        )
    }

    /** Send PUT request to SL cloud API and change the value of a tag
     * 
     * @private
     * @param {string} tagPath name of the tag
     * @param {string} tagType SystemLink format data type of tag
     * @param {function} callback 
     */
    async function createNewTagHelper(tagPath, tagType, callback) {
        new Promise(async function (resolve, reject) {

            var URL = "https://api.systemlinkcloud.com/nitag/v2/tags/";

            var data = { "type": tagType, "properties": {}, "path": tagPath, "keywords": [], "collectAggregates": false };

            var requestBody = data;

            var request = await sendXMLHTTPRequest("POST", URL, APIKey, requestBody);

            request.onload = function () {
                resolve(true);
            }

            request.onerror = function () {
                console.log("Error at createNewTagHelper", request.response);
                reject(false);
            }

            // catch error
            request.onreadystatechange = function () {
                if (this.readyState === XMLHttpRequest.DONE && (this.status != 200 && this.status != 201)) {
                    console.log(this.status + " Error at createNewTagHelper: ", this.response)
                }
            }

        }).then(
            // success handler
            function (resolve) {
                callback(resolve)
            },
            // error handler
            function (reject) {
                callback(reject)
            }
        )
    }

    /** Delete the tag on the System Link cloud
     * 
     * @private
     * @param {string} tagName 
     * @param {function} callback 
     */
    async function deleteTagHelper ( tagName, callback ) {
        new Promise(async function (resolve, reject) {

            var URL = "https://api.systemlinkcloud.com/nitag/v2/tags/" + tagName;

            var request = await sendXMLHTTPRequest("DELETE", URL, APIKey);

            request.onload = function () {
                resolve(true);
            }

            request.onerror = function () {
                console.log("Error at deleteTagHelper", request.response);
                reject(false);
            }

            // catch error
            request.onreadystatechange = function () {
                if (this.readyState === XMLHttpRequest.DONE && this.status != 200) {
                    console.log(this.status + " Error at deleteTagHelper: ", this.response)
                }
            }

        }).then(
            // success handler
            function (resolve) {
                callback(resolve)
            },
            // error handler
            function (reject) {
                callback(reject)
            }
        )
    }

    /** Helper function for sending XMLHTTPRequests
     * 
     * @private
     * @param {string} method 
     * @param {string} URL 
     * @param {string} APIKeyInput 
     * @param {object} body 
     * @returns {object} XMLHttpRequest
     */
    async function sendXMLHTTPRequest(method, URL, APIKeyInput, body) {
        var request = new XMLHttpRequest();
        request.open(method, URL, true);

        //Send the proper header information along with the request
        request.setRequestHeader("x-ni-api-key", APIKeyInput);

        if (body === undefined) {
            request.setRequestHeader("Accept", "application/json");
            
            request.send();
        }
        else {
            request.setRequestHeader("Content-type", "application/json");
            var requestBody = JSON.stringify(body);
            try {
                request.send(requestBody);
            } catch (e) {
                console.log("error sending request:", request.response);
            }
        }

        return request;
    }

    /** Helper function for getting data types in systemlink format
     * 
     * @private
     * @param {any} new_value the variable containing the new value of a tag
     * @returns {string} data type of tag
     */
    function getValueType(new_value) {
        //if the value is not a number
        if (isNaN(new_value)) {
            //if the value is a boolean
            if (new_value == "true" || new_value == "false") {
                return "BOOLEAN";
            }
            //if the value is a string
            return "STRING";
        }
        //value is a number
        else {
            //if value is an integer
            if (Number.isInteger(parseFloat(new_value))) {
                return "INT"
            }
            //if value is a double
            else {
                return "DOUBLE"
            }
        }
    }

    /** Helper function for converting values to correct type based on data type
     * 
     * @private
     * @param {string} valueType data type of value in systemlink format
     * @param {string} value value to convert
     * @returns {any} converted value
     */
    function getValueFromType(valueType, value) {
        if (valueType == "BOOLEAN") {
            if (value == "true") {
                return true;
            }
            else {
                return false;
            }
        }
        else if (valueType == "STRING") {
            return value;
        }
        else if (valueType == "INT" || valueType == "DOUBLE") {
            return parseFloat(value);
        }
        return value;
    }

    /* public members */
    return {
        init: init,
        getTagsInfo: getTagsInfo,
        setTagValue: setTagValue,
        getTagValue: getTagValue,
        executeAfterInit: executeAfterInit,
        setAPIKey: setAPIKey,
        isActive: isActive,
        createTag: createTag,
        deleteTag: deleteTag
    }
}
/*
Project Name: SPIKE Prime Web Interface
File name: ServiceDock_Airtable.js
Author: Grace Kayode
Last update: 11/5/20
Description: HTML Element definition for <service-airtable> to be used in ServiceDocks
Credits/inspirations:
    Airtable browser API (https://github.com/Airtable/airtable.js)
History:
    Created by Jeremy on 7/20/20, Edited by Grace 11/1/20
LICENSE: MIT
(C) Tufts Center for Engineering Education and Outreach (CEEO)
*/

/* ServiceDock HTML Element Definition */
// document.writeln("<script type='text/javascript' src='ServiceDock_Airtable.js'></script>");

class serviceairtable extends HTMLElement {

    constructor() {
        super();

        this.active = false; // whether the service was activated
        this.service = new Service_Airtable(); // instantiate a service object ( one object per button )
        this.proceed = false; // if there are credentials input
        this.APIKey;
        this.BaseID;
        this.TableName;

        // Create a shadow root
        var shadow = this.attachShadow({ mode: 'open' });

        /* wrapper definition and CSS */
        var wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'wrapper');
        wrapper.setAttribute("style", "width: 50px; height: 50px; position: relative; margin-top: 10px;")

        /* ServiceDock button definition and CSS */

        var button = document.createElement("button");
        button.setAttribute("id", "airtableid_button");
        button.setAttribute("class", "airtablecl_button");
        /* CSS */
        //var imageRelPath = "./modules/views/airtable-logo.png" // relative to the document in which a servicesystemlink is created ( NOT this file )
        var length = 50; // for width and height of button
        var backgroundColor = "#A2E1EF" // background color of the button

        // the icon is base64 encoded
        var buttonStyle = "width:" + length + "px; height:" + length + "px; background:" + "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAYAAAB/HSuDAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAABYlAAAWJQFJUiTwAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAABAAElEQVR4AezdB5xlRZnw/5rpMN093RMZMpIxIKCSlLRIUKIRECQNGbOurq/r7r7r7v5dd/d11V1FERCGnIOCgmRBEAREQVBAcg6TZzqH/6+me5Bhum/ovuGEX30+D91z7wl1vucOc+upOlUhWBRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQQAEFFFBAAQUUUEABBRRQ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QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIDA0wT+f7QY7l64VTJRAAAAAElFTkSuQmCC')" + " no-repeat; background-size: 40px 40px; background-color:" + backgroundColor
            + "; border: none; background-position: center; cursor: pointer; border-radius: 10px; position: relative; margin: 4px 0px; "
        button.setAttribute("style", buttonStyle);

        /* status circle definition and CSS */

        this.status = document.createElement("div");
        this.status.setAttribute("class", "status");

        /* CSS */
        var length = 20; // for width and height of circle
        var statusBackgroundColor = "red" // default background color of service (inactive color)
        var posLeft = 30;
        var posTop = 20;
        var statusStyle = "border-radius: 50%; height:" + length + "px; width:" + length + "px; background-color:" + statusBackgroundColor +
            "; position: relative; left:" + posLeft + "px; top:" + posTop + "px;";
        this.status.setAttribute("style", statusStyle);

        /* event listeners */

        button.addEventListener("mouseleave", function (event) {
            button.style.backgroundColor = "#A2E1EF";
            button.style.color = "#000000";
        });

        button.addEventListener("mouseenter", function (event) {
            button.style.backgroundColor = "#FFFFFF";
            button.style.color = "#000000";
        })


        this.addEventListener("click", async function () {

            if (!this.active) {
                this.popUpBox();
            }

            // check active flag so once activated, the service doesnt reinit
            if (!this.active && this.proceed) {

                console.log("activating service");

                var initSuccessful = await this.service.init(this.APIKey);
                var initSuccessful2 = await this.service.init(this.BaseID);
                var initSuccessful3 = await this.service.init(this.TableName);

                if (initSuccessful && initSuccessful2 && initSuccessful3) {
                    this.active = true;
                    this.status.style.backgroundColor = "green";
                }

            }

        });


        shadow.appendChild(wrapper);
        button.appendChild(this.status);
        wrapper.appendChild(button);
    }

    /* Ask user for API credentials with an alert */
    // DEV: credentials will differ by service

    popUpBox() {
        // flags to check if users' input exists
        // DEV: add as many as needed
        var APIKeyExists = true;
        var BaseIDKeyExists = true;
        var TableNameExists = true;

        // prompt user for input
        // DEV: add as many as needed
        var APIKeyResult = prompt("Please enter your API Key:");
        var BaseIDKeyResult = prompt("Please enter your BaseID Key:");
        var TableNameResult = prompt("Please enter your Base Table Name:");
        
        // if the user did not input any field, flag nonexistant field
        if (APIKeyResult == null || APIKeyResult == "") {
            console.log("You inserted no API key");
            APIKeyExists = false;
        }
        // if user did input field, flag existing field and store data
        else {
            APIKeyExists = true;
            this.APIKey = APIKeyResult;
        }

        // if the user did not input any field, flag nonexistant field
        if (BaseIDKeyResult == null || BaseIDKeyResult == "") {
            console.log("You inserted no Base key");
            BaseIDKeyExists = false;
        }
        // if user did input field, flag existing field and store data
        else {
            BaseIDKeyExists = true;
            this.BaseID = BaseIDKeyResult;
        }

        // if the user did not input any field, flag nonexistant field
        if (TableNameResult == null || TableNameResult == "") {
            console.log("You inserted no Base Table Name");
            TableNameExists = false;
        }
        // if user did input field, flag existing field and store data
        else {
            TableNameExists = true;
            this.TableName = TableNameResult;
        }

        // proceed if user input an API Key & Base ID field
        if (APIKeyExists && BaseIDKeyExists && TableNameExists) {
            this.proceed = true;
        }

        

    }

    /* allow credentials input through HTML attributes */
    // DEV: add more fields as needed
    
    // observe the attributes listed
    static get observedAttributes() {
        return ["apikey", "baseid", "tablename"];
    }

    /* getter and setter methods for credentials.*/
    get apikey() {
        return this.getAttribute("apikey");
    }
    get baseid() {
        return this.getAttribute("baseid");
    }
    get tablename() {
        return this.getAttribute("tablename");
    }


    set apikey(val) {
        console.log(val);
        if (val) {
            this.setAttribute("apikey", val);
        }
        else {
            this.removeAttribute("apikey");
        }
    }

    set baseid(val) {
        console.log(val);
        if (val) {
            this.setAttribute("baseid", val);
        }
        else {
            this.removeAttribute("baseid");
        }
    }

    set tablename(val) {
        console.log(val);
        if (val) {
            this.setAttribute("tablename", val);
        }
        else {
            this.removeAttribute("tablename");
        }
    }

    // change the API key 
    attributeChangedCallback(name, oldValue, newValue) {
        // console.log("changing attribute: ", name);
        if (name == "apikey") {
            console.log("newvalue of apikey:", newValue);
            this.APIKey = newValue;
        }
        else if (name == "baseid") {
            this.BaseID = newValue
        }
        else if (name == "tablename") {
            this.TableName = newValue
        }
        
    }

    /* functions on the HTML element */

    /* get the Service object */
    getService() {
        return this.service;
    }

    /* get whether the ServiceDock button was clicked */
    getClicked() {
        return this.active;
    }

    // initialize the service (is not used in this class but available for use publicly)
    async init() {
        console.log("apikey attribute value: ", this.APIKey);
        console.log("baseid attribute value: ", this.BaseID);
        console.log("tablename attribute value: ", this.TableName);
        var initSuccess = await this.service.init(this.APIKey, this.BaseID, this.TableName);
        if (initSuccess) {
          this.status.style.backgroundColor = "green";
          return true;
        }
        else {
            return false;
        }
    }

}

// when defining custom element, the name must have at least one - dash 
window.customElements.define('service-airtable', serviceairtable);

/* ServiceDock class Definition */

/**
 *
 * Service_Airtable
 * // if you're using ServiceDock
 * var mySL = document.getElemenyById("service_Template").getService();
 * // if you're not using ServiceDock
 * var myExampleService = new Service_Template();
 *
 * myExampleService.init();
 **/

/** Assumes your workspace only consists of two columns of records
 * that are "Name" and "Value", each of a single line text type
 * @class Service_Airtable
 * @example
 * // if you're using ServiceDock
 * var myAirtable = document.getElemenyById("service_airtable").getService();
 * // if you're not using ServiceDock
 * var myAirtable = new Service_Airtable();
 *
 * myAirtable.init(APIKEY, BASEID, TABLENAME);
 */
function Service_Airtable() {

    //////////////////////////////////////////
    //                                      //
    //          Global Variables            //
    //                                      //
    //////////////////////////////////////////

    /* private members */

    /*
    currentData = {
      Name_field: Value_field
    };
    */
    let currentData= {}; // contains real-time information of the tags in the cloud

    let recordIDNameMap = {}; // map Name fields to its record ID

    /* DEV: API credentials, add or remove as needed for your API */
    let APIKey = "API KEY"; // default APIKey in case no APIKey is given on init

    let serviceActive = false; // set to true when service goes through init

    let BaseID = "BASE ID";
    let TableName = "Table Name";
    let pollInterval = 1000; // interval at which to continuously poll the external API

    var base = undefined;
    var table = undefined;

    var funcAtInit = undefined; // function to call after init
    

    //////////////////////////////////////////
    //                                      //
    //           Public Functions           //
    //                                      //
    //////////////////////////////////////////

    /** initialize Service_Template 
     * Starts polling the external API
     * <em> this function needs to be executed after executeAfterInit but before all other public functions </em> 
     * 
     * @public
     * @ignore
     * @param {string} APIKeyInput API Key
     * @param {string} BaseIDInput Base ID for Table in which data is stored
     * @param {string} TableNameInput Table Name of Base
     * @returns {boolean} True if service was successsfully initialized, false otherwise
     * 
     */
    async function init(APIKeyInput, BaseIDInput, TableNameInput) {

        var credentialsValid = false;
        
        // if an APIKey was specified, use the specified key
        if (APIKeyInput !== undefined) {
            APIKey = APIKeyInput;
        }
        
        // if an BaseIDKey was specified, use the specified key
        if (BaseIDInput !== undefined) {
            BaseID = BaseIDInput;
        }

        // if an TableName was specified, use the specified key
        if (TableNameInput !== undefined) {
            TableName = TableNameInput;

        }

        console.log(BaseID);

        const Airtable = require('airtable');

        try {
            base = new Airtable({ apiKey: APIKey }).base(BaseID);
            credentialsValid = true;
        }
        catch (e) {
            return false;
        }

        console.log(base);
        // console.log(apiKey);

        table = base(TableName);

        // if the credentials are valid authorization
        if (credentialsValid) {

          beginDataStream(function () {
            console.log(funcAtInit)
            // call funcAtInit if defined from executeAfterInit
            if (funcAtInit !== undefined) {
              funcAtInit();
            }
          });

          return true;
        }
        else {
            return false;
        }
    }

    /** Get the callback function to execute after service is initialized
     *  <em> This function needs to be executed before calling init() </em>
     * 
     * @public
     * @param {function} callback function to execute after initialization
     * @example
     * myAirtable.executeAfterInit( function () {
     *     // your API code
     * })
     */
    function executeAfterInit(callback) {
        // Assigns global variable funcAtInit a pointer to callback function
        funcAtInit = callback;
    }

    /** Get whether the Service was initialized or not
    *
    * @public
    * @returns {boolean} whether Service was initialized or not
    */
    function isActive() {
        return serviceActive;
    }
    
    /** Get all the entries only in 'Name' column, which are keys
     * @public
     * @returns {array}
     */
    function getNames() {
      var names = [];

      for (var key in currentData) {
        names.push(key);
      }

      return names;
    }

    /** Create a Name & Value pair if it doesn't exist
     * @public
     * @param {string} name 
     * @param {string} value 
     * @param {function} callback
     */
    function createNameValuePair(name, value, callback) {
      // only create new pair if name does not yet exist
      if (currentData[name] == undefined) {
        createName({Name: name, Value: value});
        if (callback != undefined ) {
          callback();
        }
      }
      else {
        if (callback != undefined) {
          callback();
        }
      }
    }

    /** Get the Value field associated with a Name
     * @public
     * @param {string} name name of the Name entry
     * @returns {any} Value associated with the given Name
     */
    function getValue(name) {
      return convertToDataType(currentData[name]);
    }

    /** Update the Value field associated with a Name 
     * @public
     * @param {string} name 
     * @param {string} newValue 
     */
    function updateValue(name, newValue) {
      var recordID = recordIDNameMap[name];
      var convertedValue = convertToString(newValue);
      var requestBody = { Name: name, Value: convertedValue };
      updateRecord(recordID, requestBody);
    }

    /** Delete a record given a record ID
     * @public
     * @param {any} id 
     */
    const deleteRecord = async (id) => {
        try {
            const deletedRecord = await table.destroy(id);
            console.log(minifyRecord(deletedRecord));
        } catch (err) {
            console.error(err);
        }
    };

    //////////////////////////////////////////
    //                                      //
    //          Private Functions           //
    //                                      //
    //////////////////////////////////////////


    /** get an initial reading of the table, and then initialize global variable currentData
     * @private
     * 
     */
    async function beginDataStream(callback) {
      var records = await base(TableName).select().firstPage(function(err, records) {
        if (err) {
          console.log(err);
          return false;
        }
        console.log(records);
        // initialize currentData global variable
        for (var key in records) {
          var name = records[key].fields.Name;
          var value = records[key].fields.Value;
          var recordID = records[key].id;

          currentData[name] = value;
          recordIDNameMap[name] = recordID;
        }

        console.log("currentData: ", currentData);
        setTimeout( function () {
          setInterval(async function () {

            var records = await base(TableName).select().firstPage();

            // if the object is defined and not boolean false
            if (records) {
              currentData = {}; // reinitialize currentData in case some info was deleted outside
              // initialize currentData global variable
              for (var key in records) {
                var name = records[key].fields.Name;
                var value = records[key].fields.Value;
                var recordID = records[key].id;

                currentData[name] = value;
                recordIDNameMap[name] = recordID;
              }
            }

          }, 200)

          callback();
        }, 2000);

      });
    }

    /** Update the record(row) with given fields
     * @private
     * @param {integer} rowNumber row number to update
     * @param {object} fields an object with given fields to update row with
     */
    async function updateRecord(recordID, fields) {
      const updatedRecord = await table.update(recordID, fields);
      console.log(minifyRecord(updatedRecord));
    }

    /** Creates a new entry of specified data fields that gets pushed to Airtable
    * @param {string} fields passed in data fields
    */
    const createName = async (fields) => {
      const createdName = await table.create(fields);
      console.log(minifyRecord(createdName));
    };

    /** Get the content of a record/row in minified format
     * @private
     * @param {any} record 
     * @returns {object}
     */
    const minifyRecord = (record) => {
      return {
        id: record.id,
        fields: record.fields,
      };
    };

    /** Display a record by its recordID
    * @private
    * @param {any} id 
    */
    const getRecordById = async (id) => {
      const record = await table.find(id);
      console.log(record);
    };


    /** Get 50 pieces of "row" information
     * @private
     * @returns records
     */
    const getRecords = async () => {
      const records = await table.select({
        maxRecords: 50, view: 'Main View'
      }).firstPage();

      return records;
    }


    /** convert a string variable to a JS variable of its presumed data type
     * @private
     * @param {string} input 
     * @returns {any} type converted variable
     */
    function convertToDataType(input) {
      input = input.trim();
      var convertedInput;
      // string is not a pure number
      if (isNaN(input)) {
        // string is a boolean
        if (input == "True" || input == "true") {
          convertedInput = true;
        }
        else if (input == "False" || input == "false") {
          convertedInput = false;
        }
        // string is just a string
        else {
          convertedInput = input;
        }
      }
      // string is a pure number
      else {
        convertedInput = Number(input);
      }
      return convertedInput
    }

    /** Convert any variable to its string format for Airtable
     * @private
     * @param {any} input 
     * @returns {string} input converted to string
     */
    function convertToString(input) {
      var convertedInput = input;
      // input is not a pure number
      if (typeof input == "boolean") {
        if (input) {
          convertedInput = "true";
        }
        else {
          convertedInput = "false";
        }
      }
      else if (typeof input == "number") {
        convertedInput = input.toString();
      } 

      return convertedInput
    }

    /* public members */
    return {
        init: init,
        executeAfterInit, executeAfterInit,
        isActive: isActive,
        updateValue: updateValue,
        createNameValuePair: createNameValuePair,
        getRecords: getRecords,
        getValue: getValue,
        getNames: getNames,
        convertToString, convertToString,
        deleteRecord: deleteRecord,
        getRecordById: getRecordById,
        minifyRecord: minifyRecord

    }
}

require=function(){return function t(e,r,n){function o(a,s){if(!r[a]){if(!e[a]){var c="function"==typeof require&&require;if(!s&&c)return c(a,!0);if(i)return i(a,!0);var u=new Error("Cannot find module '"+a+"'");throw u.code="MODULE_NOT_FOUND",u}var f=r[a]={exports:{}};e[a][0].call(f.exports,function(t){return o(e[a][1][t]||t)},f,f.exports,t,e,r,n)}return r[a].exports}for(var i="function"==typeof require&&require,a=0;a<n.length;a++)o(n[a]);return o}}()({1:[function(t,e,r){"use strict";function n(t,e,r){this.error=t,this.message=e,this.statusCode=r}n.prototype.toString=function(){return[this.message,"(",this.error,")",this.statusCode?"[Http code "+this.statusCode+"]":""].join("")},e.exports=n},{}],2:[function(t,e,r){"use strict";var n=t("lodash/forEach"),o=t("lodash/get"),i=t("lodash/assign"),a=t("lodash/isPlainObject"),s=t("request"),c=t("./airtable_error"),u=t("./table"),f=t("./http_headers"),l=t("./run_action"),p=t("./package_version"),_=t("./exponential_backoff_with_jitter"),h=t("./promise"),y="Airtable.js/"+p;function d(t,e){this._airtable=t,this._id=e}d.prototype.table=function(t){return new u(this,null,t)},d.prototype.makeRequest=function(t){var e=this,r=o(t=t||{},"method","GET").toUpperCase(),n={method:r,url:this._airtable._endpointUrl+"/v"+this._airtable._apiVersionMajor+"/"+this._id+o(t,"path","/"),qs:o(t,"qs",{}),headers:this._getRequestHeaders(o(t,"headers",{})),json:!0,timeout:this._airtable.requestTimeout};return"body"in t&&function(t){return"GET"!==t&&"DELETE"!==t}(r)&&(n.body=t.body),new h(function(r,u){s(n,function(n,s,f){if(n||429!==s.statusCode||e._airtable._noRetryIfRateLimited)(n=n?new c("CONNECTION_ERROR",n.message,null):e._checkStatusForError(s.statusCode,f)||function(t,e){return a(e)?null:new c("UNEXPECTED_ERROR","The response from Airtable was invalid JSON. Please try again soon.",t)}(s.statusCode,f))?u(n):r({statusCode:s.statusCode,headers:s.headers,body:f});else{var l=o(t,"_numAttempts",0),p=_(l);setTimeout(function(){var n=i({},t,{_numAttempts:l+1});e.makeRequest(n).then(r).catch(u)},p)}})})},d.prototype.runAction=function(t,e,r,n,o){l(this,t,e,r,n,o,0)},d.prototype._getRequestHeaders=function(t){var e=new f;return e.set("Authorization","Bearer "+this._airtable._apiKey),e.set("User-Agent",y),n(t,function(t,r){e.set(r,t)}),e.toJSON()},d.prototype._checkStatusForError=function(t,e){return 401===t?new c("AUTHENTICATION_REQUIRED","You should provide valid api key to perform this operation",t):403===t?new c("NOT_AUTHORIZED","You are not authorized to perform this operation",t):404===t?(r=e&&e.error&&e.error.message?e.error.message:"Could not find what you are looking for",new c("NOT_FOUND",r,t)):413===t?new c("REQUEST_TOO_LARGE","Request body is too large",t):422===t?function(){var r=e&&e.error&&e.error.type?e.error.type:"UNPROCESSABLE_ENTITY",n=e&&e.error&&e.error.message?e.error.message:"The operation cannot be processed";return new c(r,n,t)}():429===t?new c("TOO_MANY_REQUESTS","You have made too many requests in a short period of time. Please retry your request later",t):500===t?new c("SERVER_ERROR","Try again. If the problem persists, contact support.",t):503===t?new c("SERVICE_UNAVAILABLE","The service is temporarily unavailable. Please retry shortly.",t):t>=400?function(){var r=e&&e.error&&e.error.type?e.error.type:"UNEXPECTED_ERROR",n=e&&e.error&&e.error.message?e.error.message:"An unexpected error occurred";return new c(r,n,t)}():null;var r},d.prototype.doCall=function(t){return this.table(t)},d.prototype.getId=function(){return this._id},d.createFunctor=function(t,e){var r=new d(t,e),o=function(){return r.doCall.apply(r,arguments)};return n(["table","makeRequest","runAction","getId"],function(t){o[t]=r[t].bind(r)}),o._base=r,o.tables=r.tables,o},e.exports=d},{"./airtable_error":1,"./exponential_backoff_with_jitter":5,"./http_headers":7,"./package_version":10,"./promise":11,"./run_action":14,"./table":15,"lodash/assign":164,"lodash/forEach":168,"lodash/get":169,"lodash/isPlainObject":184,request:203}],3:[function(t,e,r){"use strict";var n=t("./promise");e.exports=function(t,e,r){return function(){var o;if("function"!=typeof arguments[o=void 0===r?arguments.length>0?arguments.length-1:0:r]){for(var i=[],a=Math.max(arguments.length,o),s=0;s<a;s++)i.push(arguments[s]);return new n(function(r,n){i.push(function(t,e){t?n(t):r(e)}),t.apply(e,i)})}t.apply(e,arguments)}}},{"./promise":11}],4:[function(t,e,r){"use strict";var n={};e.exports=function(t,e,r){return function(){n[e]||(n[e]=!0,console.warn(r)),t.apply(this,arguments)}}},{}],5:[function(t,e,r){var n=t("./internal_config.json");e.exports=function(t){var e=n.INITIAL_RETRY_DELAY_IF_RATE_LIMITED*Math.pow(2,t),r=Math.min(n.MAX_RETRY_DELAY_IF_RATE_LIMITED,e);return Math.random()*r}},{"./internal_config.json":8}],6:[function(t,e,r){"use strict";e.exports=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)}},{}],7:[function(t,e,r){var n=t("lodash/forEach"),o="undefined"!=typeof window;function i(){this._headersByLowercasedKey={}}i.prototype.set=function(t,e){var r=t.toLowerCase();"x-airtable-user-agent"===r&&(r="user-agent",t="User-Agent"),this._headersByLowercasedKey[r]={headerKey:t,headerValue:e}},i.prototype.toJSON=function(){var t={};return n(this._headersByLowercasedKey,function(e,r){var n;n=o&&"user-agent"===r?"X-Airtable-User-Agent":e.headerKey,t[n]=e.headerValue}),t},e.exports=i},{"lodash/forEach":168}],8:[function(t,e,r){e.exports={INITIAL_RETRY_DELAY_IF_RATE_LIMITED:5e3,MAX_RETRY_DELAY_IF_RATE_LIMITED:6e5}},{}],9:[function(t,e,r){"use strict";var n=t("lodash/isArray"),o=t("lodash/forEach"),i=t("lodash/isNil");e.exports=function(t){var e=[],r=function(t,r){r=i(r)?"":r,e.push(encodeURIComponent(t)+"="+encodeURIComponent(r))};return o(t,function(t,e){!function t(e,r,i){n(r)?o(r,function(r,n){/\[\]$/.test(e)?i(e,r):t(e+"["+("object"==typeof r&&null!==r?n:"")+"]",r,i)}):"object"==typeof r?o(r,function(r,n){t(e+"["+n+"]",r,i)}):i(e,r)}(e,t,r)}),e.join("&").replace(/%20/g,"+")}},{"lodash/forEach":168,"lodash/isArray":174,"lodash/isNil":180}],10:[function(t,e,r){e.exports="0.8.1"},{}],11:[function(t,e,r){var n=t("es6-promise");e.exports="undefined"==typeof Promise?n.Promise:Promise},{"es6-promise":18}],12:[function(t,e,r){"use strict";var n=t("lodash/isPlainObject"),o=t("lodash/isFunction"),i=t("lodash/isString"),a=t("lodash/isNumber"),s=t("lodash/includes"),c=t("lodash/clone"),u=t("lodash/forEach"),f=t("lodash/map"),l=t("lodash/keys"),p=t("./typecheck"),_=t("./record"),h=t("./callback_to_promise"),y=t("./has");function d(t,e){if(!n(e))throw new Error("Expected query options to be an object");u(l(e),function(t){var r=e[t];if(!d.paramValidators[t]||!d.paramValidators[t](r).pass)throw new Error("Invalid parameter for Query: "+t)}),this._table=t,this._params=e,this.firstPage=h(b,this),this.eachPage=h(v,this,1),this.all=h(g,this)}function b(t){if(!o(t))throw new Error("The first parameter to `firstPage` must be a function");this.eachPage(function(e){t(null,e)},function(e){t(e,null)})}function v(t,e){if(!o(t))throw new Error("The first parameter to `eachPage` must be a function");if(!o(e)&&void 0!==e)throw new Error("The second parameter to `eachPage` must be a function or undefined");var r=this,n="/"+this._table._urlEncodedNameOrId(),i=c(this._params),a=function(){r._table._base.runAction("get",n,i,null,function(n,o,s){if(n)e(n,null);else{var c;s.offset?(i.offset=s.offset,c=a):c=function(){e&&e(null)};var u=f(s.records,function(t){return new _(r._table,null,t)});t(u,c)}})};a()}function g(t){if(!o(t))throw new Error("The first parameter to `all` must be a function");var e=[];this.eachPage(function(t,r){e.push.apply(e,t),r()},function(r){r?t(r,null):t(null,e)})}d.paramValidators={fields:p(p.isArrayOf(i),"the value for `fields` should be an array of strings"),filterByFormula:p(i,"the value for `filterByFormula` should be a string"),maxRecords:p(a,"the value for `maxRecords` should be a number"),pageSize:p(a,"the value for `pageSize` should be a number"),sort:p(p.isArrayOf(function(t){return n(t)&&i(t.field)&&(void 0===t.direction||s(["asc","desc"],t.direction))}),'the value for `sort` should be an array of sort objects. Each sort object must have a string `field` value, and an optional `direction` value that is "asc" or "desc".'),view:p(i,"the value for `view` should be a string"),cellFormat:p(function(t){return i(t)&&s(["json","string"],t)},'the value for `cellFormat` should be "json" or "string"'),timeZone:p(i,"the value for `timeZone` should be a string"),userLocale:p(i,"the value for `userLocale` should be a string")},d.validateParams=function(t){if(!n(t))throw new Error("Expected query params to be an object");var e={},r=[],o=[];return u(l(t),function(n){var i=t[n];if(y(d.paramValidators,n)){var a=(0,d.paramValidators[n])(i);a.pass?e[n]=i:o.push(a.error)}else r.push(n)}),{validParams:e,ignoredKeys:r,errors:o}},e.exports=d},{"./callback_to_promise":3,"./has":6,"./record":13,"./typecheck":16,"lodash/clone":165,"lodash/forEach":168,"lodash/includes":172,"lodash/isFunction":177,"lodash/isNumber":181,"lodash/isPlainObject":184,"lodash/isString":186,"lodash/keys":189,"lodash/map":191}],13:[function(t,e,r){"use strict";var n=t("lodash/assign"),o=t("./callback_to_promise");function i(t,e,r){this._table=t,this.id=e||r.id,this.setRawJson(r),this.save=o(a,this),this.patchUpdate=o(s,this),this.putUpdate=o(c,this),this.destroy=o(u,this),this.fetch=o(f,this),this.updateFields=this.patchUpdate,this.replaceFields=this.putUpdate}function a(t){this.putUpdate(this.fields,t)}function s(t,e,r){var o=this;r||(r=e,e={});var i=n({fields:t},e);this._table._base.runAction("patch","/"+this._table._urlEncodedNameOrId()+"/"+this.id,{},i,function(t,e,n){t?r(t):(o.setRawJson(n),r(null,o))})}function c(t,e,r){var o=this;r||(r=e,e={});var i=n({fields:t},e);this._table._base.runAction("put","/"+this._table._urlEncodedNameOrId()+"/"+this.id,{},i,function(t,e,n){t?r(t):(o.setRawJson(n),r(null,o))})}function u(t){var e=this;this._table._base.runAction("delete","/"+this._table._urlEncodedNameOrId()+"/"+this.id,{},null,function(r){r?t(r):t(null,e)})}function f(t){var e=this;this._table._base.runAction("get","/"+this._table._urlEncodedNameOrId()+"/"+this.id,{},null,function(r,n,o){r?t(r):(e.setRawJson(o),t(null,e))})}i.prototype.getId=function(){return this.id},i.prototype.get=function(t){return this.fields[t]},i.prototype.set=function(t,e){this.fields[t]=e},i.prototype.setRawJson=function(t){this._rawJson=t,this.fields=this._rawJson&&this._rawJson.fields||{}},e.exports=i},{"./callback_to_promise":3,"lodash/assign":164}],14:[function(t,e,r){"use strict";var n=t("./exponential_backoff_with_jitter"),o=t("./object_to_query_param_string"),i=t("./package_version"),a=t("request"),s="Airtable.js/"+i;e.exports=function t(e,r,i,c,u,f,l){var p=e._airtable._endpointUrl+"/v"+e._airtable._apiVersionMajor+"/"+e._id+i+"?"+o(c),_={authorization:"Bearer "+e._airtable._apiKey,"x-api-version":e._airtable._apiVersion,"x-airtable-application-id":e.getId()};"undefined"!=typeof window?_["x-airtable-user-agent"]=s:_["User-Agent"]=s;var h={method:r.toUpperCase(),url:p,json:!0,timeout:e._airtable.requestTimeout,headers:_};null!==u&&(h.body=u),a(h,function(o,a,s){if(o)f(o,a,s);else if(429!==a.statusCode||e._airtable._noRetryIfRateLimited)o=e._checkStatusForError(a.statusCode,s),f(o,a,s);else{var p=n(l);setTimeout(function(){t(e,r,i,c,u,f,l+1)},p)}})}},{"./exponential_backoff_with_jitter":5,"./object_to_query_param_string":9,"./package_version":10,request:203}],15:[function(t,e,r){"use strict";var n=t("lodash/isArray"),o=t("lodash/isPlainObject"),i=t("lodash/assign"),a=t("lodash/forEach"),s=t("lodash/map"),c=t("./deprecate"),u=t("./query"),f=t("./record"),l=t("./callback_to_promise");function p(t,e,r){if(!e&&!r)throw new Error("Table name or table ID is required");this._base=t,this.id=e,this.name=r,this.find=l(this._findRecordById,this),this.select=this._selectRecords.bind(this),this.create=l(this._createRecords,this),this.update=l(this._updateRecords.bind(this,!1),this),this.replace=l(this._updateRecords.bind(this,!0),this),this.destroy=l(this._destroyRecord,this),this.list=c(this._listRecords.bind(this),"table.list","Airtable: `list()` is deprecated. Use `select()` instead."),this.forEach=c(this._forEachRecord.bind(this),"table.forEach","Airtable: `forEach()` is deprecated. Use `select()` instead.")}p.prototype._findRecordById=function(t,e){new f(this,t).fetch(e)},p.prototype._selectRecords=function(t){if(void 0===t&&(t={}),arguments.length>1&&console.warn("Airtable: `select` takes only one parameter, but it was given "+arguments.length+" parameters. Use `eachPage` or `firstPage` to fetch records."),o(t)){var e=u.validateParams(t);if(e.errors.length){var r=s(e.errors,function(t){return"  * "+t});throw new Error("Airtable: invalid parameters for `select`:\n"+r.join("\n"))}return e.ignoredKeys.length&&console.warn("Airtable: the following parameters to `select` will be ignored: "+e.ignoredKeys.join(", ")),new u(this,e.validParams)}throw new Error("Airtable: the parameter for `select` should be a plain object or undefined.")},p.prototype._urlEncodedNameOrId=function(){return this.id||encodeURIComponent(this.name)},p.prototype._createRecords=function(t,e,r){var o,a=this,s=n(t);r||(r=e,e={}),i(o=s?{records:t}:{fields:t},e),this._base.runAction("post","/"+a._urlEncodedNameOrId()+"/",{},o,function(t,e,n){var o;t?r(t):(o=s?n.records.map(function(t){return new f(a,t.id,t)}):new f(a,n.id,n),r(null,o))})},p.prototype._updateRecords=function(t,e,r,a,s){var c;if(n(e)){var u=this,l=e;c=o(r)?r:{},s=a||r;var p=t?"put":"patch",_=i({records:l},c);this._base.runAction(p,"/"+this._urlEncodedNameOrId()+"/",{},_,function(t,e,r){if(t)s(t);else{var n=r.records.map(function(t){return new f(u,t.id,t)});s(null,n)}})}else{var h=e,y=r;c=o(a)?a:{},s=s||a;var d=new f(this,h);t?d.putUpdate(y,c,s):d.patchUpdate(y,c,s)}},p.prototype._destroyRecord=function(t,e){if(n(t)){var r=this,o={records:t};this._base.runAction("delete","/"+this._urlEncodedNameOrId(),o,null,function(t,n,o){if(t)e(t);else{var i=s(o.records,function(t){return new f(r,t.id,null)});e(null,i)}})}else{new f(this,t).destroy(e)}},p.prototype._listRecords=function(t,e,r,n){var o=this;n||(n=r,r={});var a=i({limit:t,offset:e},r);this._base.runAction("get","/"+this._urlEncodedNameOrId()+"/",a,null,function(t,e,r){if(t)n(t);else{var i=s(r.records,function(t){return new f(o,null,t)});n(null,i,r.offset)}})},p.prototype._forEachRecord=function(t,e,r){2===arguments.length&&(r=e,e=t,t={});var n=this,o=p.__recordsPerPageForIteration||100,i=null,s=function(){n._listRecords(o,i,t,function(t,n,o){t?r(t):(a(n,e),o?(i=o,s()):r())})};s()},e.exports=p},{"./callback_to_promise":3,"./deprecate":4,"./query":12,"./record":13,"lodash/assign":164,"lodash/forEach":168,"lodash/isArray":174,"lodash/isPlainObject":184,"lodash/map":191}],16:[function(t,e,r){"use strict";var n=t("lodash/includes"),o=t("lodash/isArray");function i(t,e){return function(r){return t(r)?{pass:!0}:{pass:!1,error:e}}}i.isOneOf=function(t){return n.bind(this,t)},i.isArrayOf=function(t){return function(e){return o(e)&&e.every(t)}},e.exports=i},{"lodash/includes":172,"lodash/isArray":174}],17:[function(t,e,r){var n,o,i=e.exports={};function a(){throw new Error("setTimeout has not been defined")}function s(){throw new Error("clearTimeout has not been defined")}function c(t){if(n===setTimeout)return setTimeout(t,0);if((n===a||!n)&&setTimeout)return n=setTimeout,setTimeout(t,0);try{return n(t,0)}catch(e){try{return n.call(null,t,0)}catch(e){return n.call(this,t,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:a}catch(t){n=a}try{o="function"==typeof clearTimeout?clearTimeout:s}catch(t){o=s}}();var u,f=[],l=!1,p=-1;function _(){l&&u&&(l=!1,u.length?f=u.concat(f):p=-1,f.length&&h())}function h(){if(!l){var t=c(_);l=!0;for(var e=f.length;e;){for(u=f,f=[];++p<e;)u&&u[p].run();p=-1,e=f.length}u=null,l=!1,function(t){if(o===clearTimeout)return clearTimeout(t);if((o===s||!o)&&clearTimeout)return o=clearTimeout,clearTimeout(t);try{o(t)}catch(e){try{return o.call(null,t)}catch(e){return o.call(this,t)}}}(t)}}function y(t,e){this.fun=t,this.array=e}function d(){}i.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)e[r-1]=arguments[r];f.push(new y(t,e)),1!==f.length||l||c(h)},y.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=d,i.addListener=d,i.once=d,i.off=d,i.removeListener=d,i.removeAllListeners=d,i.emit=d,i.prependListener=d,i.prependOnceListener=d,i.listeners=function(t){return[]},i.binding=function(t){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(t){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},{}],18:[function(t,e,r){(function(n,o){!function(t,n){"object"==typeof r&&void 0!==e?e.exports=n():"function"==typeof define&&define.amd?define(n):t.ES6Promise=n()}(this,function(){"use strict";function e(t){return"function"==typeof t}var r=Array.isArray?Array.isArray:function(t){return"[object Array]"===Object.prototype.toString.call(t)},i=0,a=void 0,s=void 0,c=function(t,e){y[i]=t,y[i+1]=e,2===(i+=2)&&(s?s(d):j())};var u="undefined"!=typeof window?window:void 0,f=u||{},l=f.MutationObserver||f.WebKitMutationObserver,p="undefined"==typeof self&&void 0!==n&&"[object process]"==={}.toString.call(n),_="undefined"!=typeof Uint8ClampedArray&&"undefined"!=typeof importScripts&&"undefined"!=typeof MessageChannel;function h(){var t=setTimeout;return function(){return t(d,1)}}var y=new Array(1e3);function d(){for(var t=0;t<i;t+=2){(0,y[t])(y[t+1]),y[t]=void 0,y[t+1]=void 0}i=0}var b,v,g,m,j=void 0;function x(t,e){var r=this,n=new this.constructor(O);void 0===n[A]&&N(n);var o=r._state;if(o){var i=arguments[o-1];c(function(){return U(o,n,i,r._result)})}else P(r,n,t,e);return n}function w(t){if(t&&"object"==typeof t&&t.constructor===this)return t;var e=new this(O);return k(e,t),e}p?j=function(){return n.nextTick(d)}:l?(v=0,g=new l(d),m=document.createTextNode(""),g.observe(m,{characterData:!0}),j=function(){m.data=v=++v%2}):_?((b=new MessageChannel).port1.onmessage=d,j=function(){return b.port2.postMessage(0)}):j=void 0===u&&"function"==typeof t?function(){try{var t=Function("return this")().require("vertx");return void 0!==(a=t.runOnLoop||t.runOnContext)?function(){a(d)}:h()}catch(t){return h()}}():h();var A=Math.random().toString(36).substring(2);function O(){}var E=void 0,T=1,S=2;function I(t,r,n){r.constructor===t.constructor&&n===x&&r.constructor.resolve===w?function(t,e){e._state===T?R(t,e._result):e._state===S?L(t,e._result):P(e,void 0,function(e){return k(t,e)},function(e){return L(t,e)})}(t,r):void 0===n?R(t,r):e(n)?function(t,e,r){c(function(t){var n=!1,o=function(t,e,r,n){try{t.call(e,r,n)}catch(t){return t}}(r,e,function(r){n||(n=!0,e!==r?k(t,r):R(t,r))},function(e){n||(n=!0,L(t,e))},t._label);!n&&o&&(n=!0,L(t,o))},t)}(t,r,n):R(t,r)}function k(t,e){if(t===e)L(t,new TypeError("You cannot resolve a promise with itself"));else if(o=typeof(n=e),null===n||"object"!==o&&"function"!==o)R(t,e);else{var r=void 0;try{r=e.then}catch(e){return void L(t,e)}I(t,e,r)}var n,o}function C(t){t._onerror&&t._onerror(t._result),M(t)}function R(t,e){t._state===E&&(t._result=e,t._state=T,0!==t._subscribers.length&&c(M,t))}function L(t,e){t._state===E&&(t._state=S,t._result=e,c(C,t))}function P(t,e,r,n){var o=t._subscribers,i=o.length;t._onerror=null,o[i]=e,o[i+T]=r,o[i+S]=n,0===i&&t._state&&c(M,t)}function M(t){var e=t._subscribers,r=t._state;if(0!==e.length){for(var n=void 0,o=void 0,i=t._result,a=0;a<e.length;a+=3)n=e[a],o=e[a+r],n?U(r,n,o,i):o(i);t._subscribers.length=0}}function U(t,r,n,o){var i=e(n),a=void 0,s=void 0,c=!0;if(i){try{a=n(o)}catch(t){c=!1,s=t}if(r===a)return void L(r,new TypeError("A promises callback cannot return that same promise."))}else a=o;r._state!==E||(i&&c?k(r,a):!1===c?L(r,s):t===T?R(r,a):t===S&&L(r,a))}var q=0;function N(t){t[A]=q++,t._state=void 0,t._result=void 0,t._subscribers=[]}var D=function(){function t(t,e){this._instanceConstructor=t,this.promise=new t(O),this.promise[A]||N(this.promise),r(e)?(this.length=e.length,this._remaining=e.length,this._result=new Array(this.length),0===this.length?R(this.promise,this._result):(this.length=this.length||0,this._enumerate(e),0===this._remaining&&R(this.promise,this._result))):L(this.promise,new Error("Array Methods must be provided an Array"))}return t.prototype._enumerate=function(t){for(var e=0;this._state===E&&e<t.length;e++)this._eachEntry(t[e],e)},t.prototype._eachEntry=function(t,e){var r=this._instanceConstructor,n=r.resolve;if(n===w){var o=void 0,i=void 0,a=!1;try{o=t.then}catch(t){a=!0,i=t}if(o===x&&t._state!==E)this._settledAt(t._state,e,t._result);else if("function"!=typeof o)this._remaining--,this._result[e]=t;else if(r===F){var s=new r(O);a?L(s,i):I(s,t,o),this._willSettleAt(s,e)}else this._willSettleAt(new r(function(e){return e(t)}),e)}else this._willSettleAt(n(t),e)},t.prototype._settledAt=function(t,e,r){var n=this.promise;n._state===E&&(this._remaining--,t===S?L(n,r):this._result[e]=r),0===this._remaining&&R(n,this._result)},t.prototype._willSettleAt=function(t,e){var r=this;P(t,void 0,function(t){return r._settledAt(T,e,t)},function(t){return r._settledAt(S,e,t)})},t}();var F=function(){function t(e){this[A]=q++,this._result=this._state=void 0,this._subscribers=[],O!==e&&("function"!=typeof e&&function(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}(),this instanceof t?function(t,e){try{e(function(e){k(t,e)},function(e){L(t,e)})}catch(e){L(t,e)}}(this,e):function(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}())}return t.prototype.catch=function(t){return this.then(null,t)},t.prototype.finally=function(t){var r=this.constructor;return e(t)?this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})}):this.then(t,t)},t}();return F.prototype.then=x,F.all=function(t){return new D(this,t).promise},F.race=function(t){var e=this;return r(t)?new e(function(r,n){for(var o=t.length,i=0;i<o;i++)e.resolve(t[i]).then(r,n)}):new e(function(t,e){return e(new TypeError("You must pass an array to race."))})},F.resolve=w,F.reject=function(t){var e=new this(O);return L(e,t),e},F._setScheduler=function(t){s=t},F._setAsap=function(t){c=t},F._asap=c,F.polyfill=function(){var t=void 0;if(void 0!==o)t=o;else if("undefined"!=typeof self)t=self;else try{t=Function("return this")()}catch(t){throw new Error("polyfill failed because global object is unavailable in this environment")}var e=t.Promise;if(e){var r=null;try{r=Object.prototype.toString.call(e.resolve())}catch(t){}if("[object Promise]"===r&&!e.cast)return}t.Promise=F},F.Promise=F,F})}).call(this,t("_process"),"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{_process:17}],19:[function(t,e,r){var n=t("is-function");e.exports=function(t,e,r){if(!n(e))throw new TypeError("iterator must be a function");arguments.length<3&&(r=this);"[object Array]"===o.call(t)?function(t,e,r){for(var n=0,o=t.length;n<o;n++)i.call(t,n)&&e.call(r,t[n],n,t)}(t,e,r):"string"==typeof t?function(t,e,r){for(var n=0,o=t.length;n<o;n++)e.call(r,t.charAt(n),n,t)}(t,e,r):function(t,e,r){for(var n in t)i.call(t,n)&&e.call(r,t[n],n,t)}(t,e,r)};var o=Object.prototype.toString,i=Object.prototype.hasOwnProperty},{"is-function":21}],20:[function(t,e,r){(function(t){var r;r="undefined"!=typeof window?window:void 0!==t?t:"undefined"!=typeof self?self:{},e.exports=r}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],21:[function(t,e,r){e.exports=function(t){var e=n.call(t);return"[object Function]"===e||"function"==typeof t&&"[object RegExp]"!==e||"undefined"!=typeof window&&(t===window.setTimeout||t===window.alert||t===window.confirm||t===window.prompt)};var n=Object.prototype.toString},{}],22:[function(t,e,r){var n=t("./_getNative")(t("./_root"),"DataView");e.exports=n},{"./_getNative":106,"./_root":149}],23:[function(t,e,r){var n=t("./_hashClear"),o=t("./_hashDelete"),i=t("./_hashGet"),a=t("./_hashHas"),s=t("./_hashSet");function c(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}c.prototype.clear=n,c.prototype.delete=o,c.prototype.get=i,c.prototype.has=a,c.prototype.set=s,e.exports=c},{"./_hashClear":114,"./_hashDelete":115,"./_hashGet":116,"./_hashHas":117,"./_hashSet":118}],24:[function(t,e,r){var n=t("./_listCacheClear"),o=t("./_listCacheDelete"),i=t("./_listCacheGet"),a=t("./_listCacheHas"),s=t("./_listCacheSet");function c(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}c.prototype.clear=n,c.prototype.delete=o,c.prototype.get=i,c.prototype.has=a,c.prototype.set=s,e.exports=c},{"./_listCacheClear":129,"./_listCacheDelete":130,"./_listCacheGet":131,"./_listCacheHas":132,"./_listCacheSet":133}],25:[function(t,e,r){var n=t("./_getNative")(t("./_root"),"Map");e.exports=n},{"./_getNative":106,"./_root":149}],26:[function(t,e,r){var n=t("./_mapCacheClear"),o=t("./_mapCacheDelete"),i=t("./_mapCacheGet"),a=t("./_mapCacheHas"),s=t("./_mapCacheSet");function c(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}c.prototype.clear=n,c.prototype.delete=o,c.prototype.get=i,c.prototype.has=a,c.prototype.set=s,e.exports=c},{"./_mapCacheClear":134,"./_mapCacheDelete":135,"./_mapCacheGet":136,"./_mapCacheHas":137,"./_mapCacheSet":138}],27:[function(t,e,r){var n=t("./_getNative")(t("./_root"),"Promise");e.exports=n},{"./_getNative":106,"./_root":149}],28:[function(t,e,r){var n=t("./_getNative")(t("./_root"),"Set");e.exports=n},{"./_getNative":106,"./_root":149}],29:[function(t,e,r){var n=t("./_MapCache"),o=t("./_setCacheAdd"),i=t("./_setCacheHas");function a(t){var e=-1,r=null==t?0:t.length;for(this.__data__=new n;++e<r;)this.add(t[e])}a.prototype.add=a.prototype.push=o,a.prototype.has=i,e.exports=a},{"./_MapCache":26,"./_setCacheAdd":150,"./_setCacheHas":151}],30:[function(t,e,r){var n=t("./_ListCache"),o=t("./_stackClear"),i=t("./_stackDelete"),a=t("./_stackGet"),s=t("./_stackHas"),c=t("./_stackSet");function u(t){var e=this.__data__=new n(t);this.size=e.size}u.prototype.clear=o,u.prototype.delete=i,u.prototype.get=a,u.prototype.has=s,u.prototype.set=c,e.exports=u},{"./_ListCache":24,"./_stackClear":155,"./_stackDelete":156,"./_stackGet":157,"./_stackHas":158,"./_stackSet":159}],31:[function(t,e,r){var n=t("./_root").Symbol;e.exports=n},{"./_root":149}],32:[function(t,e,r){var n=t("./_root").Uint8Array;e.exports=n},{"./_root":149}],33:[function(t,e,r){var n=t("./_getNative")(t("./_root"),"WeakMap");e.exports=n},{"./_getNative":106,"./_root":149}],34:[function(t,e,r){e.exports=function(t,e,r){switch(r.length){case 0:return t.call(e);case 1:return t.call(e,r[0]);case 2:return t.call(e,r[0],r[1]);case 3:return t.call(e,r[0],r[1],r[2])}return t.apply(e,r)}},{}],35:[function(t,e,r){e.exports=function(t,e){for(var r=-1,n=null==t?0:t.length;++r<n&&!1!==e(t[r],r,t););return t}},{}],36:[function(t,e,r){e.exports=function(t,e){for(var r=-1,n=null==t?0:t.length,o=0,i=[];++r<n;){var a=t[r];e(a,r,t)&&(i[o++]=a)}return i}},{}],37:[function(t,e,r){var n=t("./_baseTimes"),o=t("./isArguments"),i=t("./isArray"),a=t("./isBuffer"),s=t("./_isIndex"),c=t("./isTypedArray"),u=Object.prototype.hasOwnProperty;e.exports=function(t,e){var r=i(t),f=!r&&o(t),l=!r&&!f&&a(t),p=!r&&!f&&!l&&c(t),_=r||f||l||p,h=_?n(t.length,String):[],y=h.length;for(var d in t)!e&&!u.call(t,d)||_&&("length"==d||l&&("offset"==d||"parent"==d)||p&&("buffer"==d||"byteLength"==d||"byteOffset"==d)||s(d,y))||h.push(d);return h}},{"./_baseTimes":76,"./_isIndex":122,"./isArguments":173,"./isArray":174,"./isBuffer":176,"./isTypedArray":188}],38:[function(t,e,r){e.exports=function(t,e){for(var r=-1,n=null==t?0:t.length,o=Array(n);++r<n;)o[r]=e(t[r],r,t);return o}},{}],39:[function(t,e,r){e.exports=function(t,e){for(var r=-1,n=e.length,o=t.length;++r<n;)t[o+r]=e[r];return t}},{}],40:[function(t,e,r){e.exports=function(t,e){for(var r=-1,n=null==t?0:t.length;++r<n;)if(e(t[r],r,t))return!0;return!1}},{}],41:[function(t,e,r){var n=t("./_baseAssignValue"),o=t("./eq"),i=Object.prototype.hasOwnProperty;e.exports=function(t,e,r){var a=t[e];i.call(t,e)&&o(a,r)&&(void 0!==r||e in t)||n(t,e,r)}},{"./_baseAssignValue":45,"./eq":167}],42:[function(t,e,r){var n=t("./eq");e.exports=function(t,e){for(var r=t.length;r--;)if(n(t[r][0],e))return r;return-1}},{"./eq":167}],43:[function(t,e,r){var n=t("./_copyObject"),o=t("./keys");e.exports=function(t,e){return t&&n(e,o(e),t)}},{"./_copyObject":90,"./keys":189}],44:[function(t,e,r){var n=t("./_copyObject"),o=t("./keysIn");e.exports=function(t,e){return t&&n(e,o(e),t)}},{"./_copyObject":90,"./keysIn":190}],45:[function(t,e,r){var n=t("./_defineProperty");e.exports=function(t,e,r){"__proto__"==e&&n?n(t,e,{configurable:!0,enumerable:!0,value:r,writable:!0}):t[e]=r}},{"./_defineProperty":97}],46:[function(t,e,r){var n=t("./_Stack"),o=t("./_arrayEach"),i=t("./_assignValue"),a=t("./_baseAssign"),s=t("./_baseAssignIn"),c=t("./_cloneBuffer"),u=t("./_copyArray"),f=t("./_copySymbols"),l=t("./_copySymbolsIn"),p=t("./_getAllKeys"),_=t("./_getAllKeysIn"),h=t("./_getTag"),y=t("./_initCloneArray"),d=t("./_initCloneByTag"),b=t("./_initCloneObject"),v=t("./isArray"),g=t("./isBuffer"),m=t("./isMap"),j=t("./isObject"),x=t("./isSet"),w=t("./keys"),A=1,O=2,E=4,T="[object Arguments]",S="[object Function]",I="[object GeneratorFunction]",k="[object Object]",C={};C[T]=C["[object Array]"]=C["[object ArrayBuffer]"]=C["[object DataView]"]=C["[object Boolean]"]=C["[object Date]"]=C["[object Float32Array]"]=C["[object Float64Array]"]=C["[object Int8Array]"]=C["[object Int16Array]"]=C["[object Int32Array]"]=C["[object Map]"]=C["[object Number]"]=C[k]=C["[object RegExp]"]=C["[object Set]"]=C["[object String]"]=C["[object Symbol]"]=C["[object Uint8Array]"]=C["[object Uint8ClampedArray]"]=C["[object Uint16Array]"]=C["[object Uint32Array]"]=!0,C["[object Error]"]=C[S]=C["[object WeakMap]"]=!1,e.exports=function t(e,r,R,L,P,M){var U,q=r&A,N=r&O,D=r&E;if(R&&(U=P?R(e,L,P,M):R(e)),void 0!==U)return U;if(!j(e))return e;var F=v(e);if(F){if(U=y(e),!q)return u(e,U)}else{var K=h(e),B=K==S||K==I;if(g(e))return c(e,q);if(K==k||K==T||B&&!P){if(U=N||B?{}:b(e),!q)return N?l(e,s(U,e)):f(e,a(U,e))}else{if(!C[K])return P?e:{};U=d(e,K,q)}}M||(M=new n);var V=M.get(e);if(V)return V;M.set(e,U),x(e)?e.forEach(function(n){U.add(t(n,r,R,n,e,M))}):m(e)&&e.forEach(function(n,o){U.set(o,t(n,r,R,o,e,M))});var G=D?N?_:p:N?keysIn:w,H=F?void 0:G(e);return o(H||e,function(n,o){H&&(n=e[o=n]),i(U,o,t(n,r,R,o,e,M))}),U}},{"./_Stack":30,"./_arrayEach":35,"./_assignValue":41,"./_baseAssign":43,"./_baseAssignIn":44,"./_cloneBuffer":84,"./_copyArray":89,"./_copySymbols":91,"./_copySymbolsIn":92,"./_getAllKeys":102,"./_getAllKeysIn":103,"./_getTag":111,"./_initCloneArray":119,"./_initCloneByTag":120,"./_initCloneObject":121,"./isArray":174,"./isBuffer":176,"./isMap":179,"./isObject":182,"./isSet":185,"./keys":189}],47:[function(t,e,r){var n=t("./isObject"),o=Object.create,i=function(){function t(){}return function(e){if(!n(e))return{};if(o)return o(e);t.prototype=e;var r=new t;return t.prototype=void 0,r}}();e.exports=i},{"./isObject":182}],48:[function(t,e,r){var n=t("./_baseForOwn"),o=t("./_createBaseEach")(n);e.exports=o},{"./_baseForOwn":51,"./_createBaseEach":95}],49:[function(t,e,r){e.exports=function(t,e,r,n){for(var o=t.length,i=r+(n?1:-1);n?i--:++i<o;)if(e(t[i],i,t))return i;return-1}},{}],50:[function(t,e,r){var n=t("./_createBaseFor")();e.exports=n},{"./_createBaseFor":96}],51:[function(t,e,r){var n=t("./_baseFor"),o=t("./keys");e.exports=function(t,e){return t&&n(t,e,o)}},{"./_baseFor":50,"./keys":189}],52:[function(t,e,r){var n=t("./_castPath"),o=t("./_toKey");e.exports=function(t,e){for(var r=0,i=(e=n(e,t)).length;null!=t&&r<i;)t=t[o(e[r++])];return r&&r==i?t:void 0}},{"./_castPath":82,"./_toKey":162}],53:[function(t,e,r){var n=t("./_arrayPush"),o=t("./isArray");e.exports=function(t,e,r){var i=e(t);return o(t)?i:n(i,r(t))}},{"./_arrayPush":39,"./isArray":174}],54:[function(t,e,r){var n=t("./_Symbol"),o=t("./_getRawTag"),i=t("./_objectToString"),a="[object Null]",s="[object Undefined]",c=n?n.toStringTag:void 0;e.exports=function(t){return null==t?void 0===t?s:a:c&&c in Object(t)?o(t):i(t)}},{"./_Symbol":31,"./_getRawTag":108,"./_objectToString":146}],55:[function(t,e,r){e.exports=function(t,e){return null!=t&&e in Object(t)}},{}],56:[function(t,e,r){var n=t("./_baseFindIndex"),o=t("./_baseIsNaN"),i=t("./_strictIndexOf");e.exports=function(t,e,r){return e==e?i(t,e,r):n(t,o,r)}},{"./_baseFindIndex":49,"./_baseIsNaN":62,"./_strictIndexOf":160}],57:[function(t,e,r){var n=t("./_baseGetTag"),o=t("./isObjectLike"),i="[object Arguments]";e.exports=function(t){return o(t)&&n(t)==i}},{"./_baseGetTag":54,"./isObjectLike":183}],58:[function(t,e,r){var n=t("./_baseIsEqualDeep"),o=t("./isObjectLike");e.exports=function t(e,r,i,a,s){return e===r||(null==e||null==r||!o(e)&&!o(r)?e!=e&&r!=r:n(e,r,i,a,t,s))}},{"./_baseIsEqualDeep":59,"./isObjectLike":183}],59:[function(t,e,r){var n=t("./_Stack"),o=t("./_equalArrays"),i=t("./_equalByTag"),a=t("./_equalObjects"),s=t("./_getTag"),c=t("./isArray"),u=t("./isBuffer"),f=t("./isTypedArray"),l=1,p="[object Arguments]",_="[object Array]",h="[object Object]",y=Object.prototype.hasOwnProperty;e.exports=function(t,e,r,d,b,v){var g=c(t),m=c(e),j=g?_:s(t),x=m?_:s(e),w=(j=j==p?h:j)==h,A=(x=x==p?h:x)==h,O=j==x;if(O&&u(t)){if(!u(e))return!1;g=!0,w=!1}if(O&&!w)return v||(v=new n),g||f(t)?o(t,e,r,d,b,v):i(t,e,j,r,d,b,v);if(!(r&l)){var E=w&&y.call(t,"__wrapped__"),T=A&&y.call(e,"__wrapped__");if(E||T){var S=E?t.value():t,I=T?e.value():e;return v||(v=new n),b(S,I,r,d,v)}}return!!O&&(v||(v=new n),a(t,e,r,d,b,v))}},{"./_Stack":30,"./_equalArrays":98,"./_equalByTag":99,"./_equalObjects":100,"./_getTag":111,"./isArray":174,"./isBuffer":176,"./isTypedArray":188}],60:[function(t,e,r){var n=t("./_getTag"),o=t("./isObjectLike"),i="[object Map]";e.exports=function(t){return o(t)&&n(t)==i}},{"./_getTag":111,"./isObjectLike":183}],61:[function(t,e,r){var n=t("./_Stack"),o=t("./_baseIsEqual"),i=1,a=2;e.exports=function(t,e,r,s){var c=r.length,u=c,f=!s;if(null==t)return!u;for(t=Object(t);c--;){var l=r[c];if(f&&l[2]?l[1]!==t[l[0]]:!(l[0]in t))return!1}for(;++c<u;){var p=(l=r[c])[0],_=t[p],h=l[1];if(f&&l[2]){if(void 0===_&&!(p in t))return!1}else{var y=new n;if(s)var d=s(_,h,p,t,e,y);if(!(void 0===d?o(h,_,i|a,s,y):d))return!1}}return!0}},{"./_Stack":30,"./_baseIsEqual":58}],62:[function(t,e,r){e.exports=function(t){return t!=t}},{}],63:[function(t,e,r){var n=t("./isFunction"),o=t("./_isMasked"),i=t("./isObject"),a=t("./_toSource"),s=/^\[object .+?Constructor\]$/,c=Function.prototype,u=Object.prototype,f=c.toString,l=u.hasOwnProperty,p=RegExp("^"+f.call(l).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$");e.exports=function(t){return!(!i(t)||o(t))&&(n(t)?p:s).test(a(t))}},{"./_isMasked":126,"./_toSource":163,"./isFunction":177,"./isObject":182}],64:[function(t,e,r){var n=t("./_getTag"),o=t("./isObjectLike"),i="[object Set]";e.exports=function(t){return o(t)&&n(t)==i}},{"./_getTag":111,"./isObjectLike":183}],65:[function(t,e,r){var n=t("./_baseGetTag"),o=t("./isLength"),i=t("./isObjectLike"),a={};a["[object Float32Array]"]=a["[object Float64Array]"]=a["[object Int8Array]"]=a["[object Int16Array]"]=a["[object Int32Array]"]=a["[object Uint8Array]"]=a["[object Uint8ClampedArray]"]=a["[object Uint16Array]"]=a["[object Uint32Array]"]=!0,a["[object Arguments]"]=a["[object Array]"]=a["[object ArrayBuffer]"]=a["[object Boolean]"]=a["[object DataView]"]=a["[object Date]"]=a["[object Error]"]=a["[object Function]"]=a["[object Map]"]=a["[object Number]"]=a["[object Object]"]=a["[object RegExp]"]=a["[object Set]"]=a["[object String]"]=a["[object WeakMap]"]=!1,e.exports=function(t){return i(t)&&o(t.length)&&!!a[n(t)]}},{"./_baseGetTag":54,"./isLength":178,"./isObjectLike":183}],66:[function(t,e,r){var n=t("./_baseMatches"),o=t("./_baseMatchesProperty"),i=t("./identity"),a=t("./isArray"),s=t("./property");e.exports=function(t){return"function"==typeof t?t:null==t?i:"object"==typeof t?a(t)?o(t[0],t[1]):n(t):s(t)}},{"./_baseMatches":70,"./_baseMatchesProperty":71,"./identity":171,"./isArray":174,"./property":193}],67:[function(t,e,r){var n=t("./_isPrototype"),o=t("./_nativeKeys"),i=Object.prototype.hasOwnProperty;e.exports=function(t){if(!n(t))return o(t);var e=[];for(var r in Object(t))i.call(t,r)&&"constructor"!=r&&e.push(r);return e}},{"./_isPrototype":127,"./_nativeKeys":143}],68:[function(t,e,r){var n=t("./isObject"),o=t("./_isPrototype"),i=t("./_nativeKeysIn"),a=Object.prototype.hasOwnProperty;e.exports=function(t){if(!n(t))return i(t);var e=o(t),r=[];for(var s in t)("constructor"!=s||!e&&a.call(t,s))&&r.push(s);return r}},{"./_isPrototype":127,"./_nativeKeysIn":144,"./isObject":182}],69:[function(t,e,r){var n=t("./_baseEach"),o=t("./isArrayLike");e.exports=function(t,e){var r=-1,i=o(t)?Array(t.length):[];return n(t,function(t,n,o){i[++r]=e(t,n,o)}),i}},{"./_baseEach":48,"./isArrayLike":175}],70:[function(t,e,r){var n=t("./_baseIsMatch"),o=t("./_getMatchData"),i=t("./_matchesStrictComparable");e.exports=function(t){var e=o(t);return 1==e.length&&e[0][2]?i(e[0][0],e[0][1]):function(r){return r===t||n(r,t,e)}}},{"./_baseIsMatch":61,"./_getMatchData":105,"./_matchesStrictComparable":140}],71:[function(t,e,r){var n=t("./_baseIsEqual"),o=t("./get"),i=t("./hasIn"),a=t("./_isKey"),s=t("./_isStrictComparable"),c=t("./_matchesStrictComparable"),u=t("./_toKey"),f=1,l=2;e.exports=function(t,e){return a(t)&&s(e)?c(u(t),e):function(r){var a=o(r,t);return void 0===a&&a===e?i(r,t):n(e,a,f|l)}}},{"./_baseIsEqual":58,"./_isKey":124,"./_isStrictComparable":128,"./_matchesStrictComparable":140,"./_toKey":162,"./get":169,"./hasIn":170}],72:[function(t,e,r){e.exports=function(t){return function(e){return null==e?void 0:e[t]}}},{}],73:[function(t,e,r){var n=t("./_baseGet");e.exports=function(t){return function(e){return n(e,t)}}},{"./_baseGet":52}],74:[function(t,e,r){var n=t("./identity"),o=t("./_overRest"),i=t("./_setToString");e.exports=function(t,e){return i(o(t,e,n),t+"")}},{"./_overRest":148,"./_setToString":153,"./identity":171}],75:[function(t,e,r){var n=t("./constant"),o=t("./_defineProperty"),i=t("./identity"),a=o?function(t,e){return o(t,"toString",{configurable:!0,enumerable:!1,value:n(e),writable:!0})}:i;e.exports=a},{"./_defineProperty":97,"./constant":166,"./identity":171}],76:[function(t,e,r){e.exports=function(t,e){for(var r=-1,n=Array(t);++r<t;)n[r]=e(r);return n}},{}],77:[function(t,e,r){var n=t("./_Symbol"),o=t("./_arrayMap"),i=t("./isArray"),a=t("./isSymbol"),s=1/0,c=n?n.prototype:void 0,u=c?c.toString:void 0;e.exports=function t(e){if("string"==typeof e)return e;if(i(e))return o(e,t)+"";if(a(e))return u?u.call(e):"";var r=e+"";return"0"==r&&1/e==-s?"-0":r}},{"./_Symbol":31,"./_arrayMap":38,"./isArray":174,"./isSymbol":187}],78:[function(t,e,r){e.exports=function(t){return function(e){return t(e)}}},{}],79:[function(t,e,r){var n=t("./_arrayMap");e.exports=function(t,e){return n(e,function(e){return t[e]})}},{"./_arrayMap":38}],80:[function(t,e,r){e.exports=function(t,e){return t.has(e)}},{}],81:[function(t,e,r){var n=t("./identity");e.exports=function(t){return"function"==typeof t?t:n}},{"./identity":171}],82:[function(t,e,r){var n=t("./isArray"),o=t("./_isKey"),i=t("./_stringToPath"),a=t("./toString");e.exports=function(t,e){return n(t)?t:o(t,e)?[t]:i(a(t))}},{"./_isKey":124,"./_stringToPath":161,"./isArray":174,"./toString":199}],83:[function(t,e,r){var n=t("./_Uint8Array");e.exports=function(t){var e=new t.constructor(t.byteLength);return new n(e).set(new n(t)),e}},{"./_Uint8Array":32}],84:[function(t,e,r){var n=t("./_root"),o="object"==typeof r&&r&&!r.nodeType&&r,i=o&&"object"==typeof e&&e&&!e.nodeType&&e,a=i&&i.exports===o?n.Buffer:void 0,s=a?a.allocUnsafe:void 0;e.exports=function(t,e){if(e)return t.slice();var r=t.length,n=s?s(r):new t.constructor(r);return t.copy(n),n}},{"./_root":149}],85:[function(t,e,r){var n=t("./_cloneArrayBuffer");e.exports=function(t,e){var r=e?n(t.buffer):t.buffer;return new t.constructor(r,t.byteOffset,t.byteLength)}},{"./_cloneArrayBuffer":83}],86:[function(t,e,r){var n=/\w*$/;e.exports=function(t){var e=new t.constructor(t.source,n.exec(t));return e.lastIndex=t.lastIndex,e}},{}],87:[function(t,e,r){var n=t("./_Symbol"),o=n?n.prototype:void 0,i=o?o.valueOf:void 0;e.exports=function(t){return i?Object(i.call(t)):{}}},{"./_Symbol":31}],88:[function(t,e,r){var n=t("./_cloneArrayBuffer");e.exports=function(t,e){var r=e?n(t.buffer):t.buffer;return new t.constructor(r,t.byteOffset,t.length)}},{"./_cloneArrayBuffer":83}],89:[function(t,e,r){e.exports=function(t,e){var r=-1,n=t.length;for(e||(e=Array(n));++r<n;)e[r]=t[r];return e}},{}],90:[function(t,e,r){var n=t("./_assignValue"),o=t("./_baseAssignValue");e.exports=function(t,e,r,i){var a=!r;r||(r={});for(var s=-1,c=e.length;++s<c;){var u=e[s],f=i?i(r[u],t[u],u,r,t):void 0;void 0===f&&(f=t[u]),a?o(r,u,f):n(r,u,f)}return r}},{"./_assignValue":41,"./_baseAssignValue":45}],91:[function(t,e,r){var n=t("./_copyObject"),o=t("./_getSymbols");e.exports=function(t,e){return n(t,o(t),e)}},{"./_copyObject":90,"./_getSymbols":109}],92:[function(t,e,r){var n=t("./_copyObject"),o=t("./_getSymbolsIn");e.exports=function(t,e){return n(t,o(t),e)}},{"./_copyObject":90,"./_getSymbolsIn":110}],93:[function(t,e,r){var n=t("./_root")["__core-js_shared__"];e.exports=n},{"./_root":149}],94:[function(t,e,r){var n=t("./_baseRest"),o=t("./_isIterateeCall");e.exports=function(t){return n(function(e,r){var n=-1,i=r.length,a=i>1?r[i-1]:void 0,s=i>2?r[2]:void 0;for(a=t.length>3&&"function"==typeof a?(i--,a):void 0,s&&o(r[0],r[1],s)&&(a=i<3?void 0:a,i=1),e=Object(e);++n<i;){var c=r[n];c&&t(e,c,n,a)}return e})}},{"./_baseRest":74,"./_isIterateeCall":123}],95:[function(t,e,r){var n=t("./isArrayLike");e.exports=function(t,e){return function(r,o){if(null==r)return r;if(!n(r))return t(r,o);for(var i=r.length,a=e?i:-1,s=Object(r);(e?a--:++a<i)&&!1!==o(s[a],a,s););return r}}},{"./isArrayLike":175}],96:[function(t,e,r){e.exports=function(t){return function(e,r,n){for(var o=-1,i=Object(e),a=n(e),s=a.length;s--;){var c=a[t?s:++o];if(!1===r(i[c],c,i))break}return e}}},{}],97:[function(t,e,r){var n=t("./_getNative"),o=function(){try{var t=n(Object,"defineProperty");return t({},"",{}),t}catch(t){}}();e.exports=o},{"./_getNative":106}],98:[function(t,e,r){var n=t("./_SetCache"),o=t("./_arraySome"),i=t("./_cacheHas"),a=1,s=2;e.exports=function(t,e,r,c,u,f){var l=r&a,p=t.length,_=e.length;if(p!=_&&!(l&&_>p))return!1;var h=f.get(t);if(h&&f.get(e))return h==e;var y=-1,d=!0,b=r&s?new n:void 0;for(f.set(t,e),f.set(e,t);++y<p;){var v=t[y],g=e[y];if(c)var m=l?c(g,v,y,e,t,f):c(v,g,y,t,e,f);if(void 0!==m){if(m)continue;d=!1;break}if(b){if(!o(e,function(t,e){if(!i(b,e)&&(v===t||u(v,t,r,c,f)))return b.push(e)})){d=!1;break}}else if(v!==g&&!u(v,g,r,c,f)){d=!1;break}}return f.delete(t),f.delete(e),d}},{"./_SetCache":29,"./_arraySome":40,"./_cacheHas":80}],99:[function(t,e,r){var n=t("./_Symbol"),o=t("./_Uint8Array"),i=t("./eq"),a=t("./_equalArrays"),s=t("./_mapToArray"),c=t("./_setToArray"),u=1,f=2,l="[object Boolean]",p="[object Date]",_="[object Error]",h="[object Map]",y="[object Number]",d="[object RegExp]",b="[object Set]",v="[object String]",g="[object Symbol]",m="[object ArrayBuffer]",j="[object DataView]",x=n?n.prototype:void 0,w=x?x.valueOf:void 0;e.exports=function(t,e,r,n,x,A,O){switch(r){case j:if(t.byteLength!=e.byteLength||t.byteOffset!=e.byteOffset)return!1;t=t.buffer,e=e.buffer;case m:return!(t.byteLength!=e.byteLength||!A(new o(t),new o(e)));case l:case p:case y:return i(+t,+e);case _:return t.name==e.name&&t.message==e.message;case d:case v:return t==e+"";case h:var E=s;case b:var T=n&u;if(E||(E=c),t.size!=e.size&&!T)return!1;var S=O.get(t);if(S)return S==e;n|=f,O.set(t,e);var I=a(E(t),E(e),n,x,A,O);return O.delete(t),I;case g:if(w)return w.call(t)==w.call(e)}return!1}},{"./_Symbol":31,"./_Uint8Array":32,"./_equalArrays":98,"./_mapToArray":139,"./_setToArray":152,"./eq":167}],100:[function(t,e,r){var n=t("./_getAllKeys"),o=1,i=Object.prototype.hasOwnProperty;e.exports=function(t,e,r,a,s,c){var u=r&o,f=n(t),l=f.length;if(l!=n(e).length&&!u)return!1;for(var p=l;p--;){var _=f[p];if(!(u?_ in e:i.call(e,_)))return!1}var h=c.get(t);if(h&&c.get(e))return h==e;var y=!0;c.set(t,e),c.set(e,t);for(var d=u;++p<l;){var b=t[_=f[p]],v=e[_];if(a)var g=u?a(v,b,_,e,t,c):a(b,v,_,t,e,c);if(!(void 0===g?b===v||s(b,v,r,a,c):g)){y=!1;break}d||(d="constructor"==_)}if(y&&!d){var m=t.constructor,j=e.constructor;m!=j&&"constructor"in t&&"constructor"in e&&!("function"==typeof m&&m instanceof m&&"function"==typeof j&&j instanceof j)&&(y=!1)}return c.delete(t),c.delete(e),y}},{"./_getAllKeys":102}],101:[function(t,e,r){(function(t){var r="object"==typeof t&&t&&t.Object===Object&&t;e.exports=r}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],102:[function(t,e,r){var n=t("./_baseGetAllKeys"),o=t("./_getSymbols"),i=t("./keys");e.exports=function(t){return n(t,i,o)}},{"./_baseGetAllKeys":53,"./_getSymbols":109,"./keys":189}],103:[function(t,e,r){var n=t("./_baseGetAllKeys"),o=t("./_getSymbolsIn"),i=t("./keysIn");e.exports=function(t){return n(t,i,o)}},{"./_baseGetAllKeys":53,"./_getSymbolsIn":110,"./keysIn":190}],104:[function(t,e,r){var n=t("./_isKeyable");e.exports=function(t,e){var r=t.__data__;return n(e)?r["string"==typeof e?"string":"hash"]:r.map}},{"./_isKeyable":125}],105:[function(t,e,r){var n=t("./_isStrictComparable"),o=t("./keys");e.exports=function(t){for(var e=o(t),r=e.length;r--;){var i=e[r],a=t[i];e[r]=[i,a,n(a)]}return e}},{"./_isStrictComparable":128,"./keys":189}],106:[function(t,e,r){var n=t("./_baseIsNative"),o=t("./_getValue");e.exports=function(t,e){var r=o(t,e);return n(r)?r:void 0}},{"./_baseIsNative":63,"./_getValue":112}],107:[function(t,e,r){var n=t("./_overArg")(Object.getPrototypeOf,Object);e.exports=n},{"./_overArg":147}],108:[function(t,e,r){var n=t("./_Symbol"),o=Object.prototype,i=o.hasOwnProperty,a=o.toString,s=n?n.toStringTag:void 0;e.exports=function(t){var e=i.call(t,s),r=t[s];try{t[s]=void 0;var n=!0}catch(t){}var o=a.call(t);return n&&(e?t[s]=r:delete t[s]),o}},{"./_Symbol":31}],109:[function(t,e,r){var n=t("./_arrayFilter"),o=t("./stubArray"),i=Object.prototype.propertyIsEnumerable,a=Object.getOwnPropertySymbols,s=a?function(t){return null==t?[]:(t=Object(t),n(a(t),function(e){return i.call(t,e)}))}:o;e.exports=s},{"./_arrayFilter":36,"./stubArray":194}],110:[function(t,e,r){var n=t("./_arrayPush"),o=t("./_getPrototype"),i=t("./_getSymbols"),a=t("./stubArray"),s=Object.getOwnPropertySymbols?function(t){for(var e=[];t;)n(e,i(t)),t=o(t);return e}:a;e.exports=s},{"./_arrayPush":39,"./_getPrototype":107,"./_getSymbols":109,"./stubArray":194}],111:[function(t,e,r){var n=t("./_DataView"),o=t("./_Map"),i=t("./_Promise"),a=t("./_Set"),s=t("./_WeakMap"),c=t("./_baseGetTag"),u=t("./_toSource"),f=u(n),l=u(o),p=u(i),_=u(a),h=u(s),y=c;(n&&"[object DataView]"!=y(new n(new ArrayBuffer(1)))||o&&"[object Map]"!=y(new o)||i&&"[object Promise]"!=y(i.resolve())||a&&"[object Set]"!=y(new a)||s&&"[object WeakMap]"!=y(new s))&&(y=function(t){var e=c(t),r="[object Object]"==e?t.constructor:void 0,n=r?u(r):"";if(n)switch(n){case f:return"[object DataView]";case l:return"[object Map]";case p:return"[object Promise]";case _:return"[object Set]";case h:return"[object WeakMap]"}return e}),e.exports=y},{"./_DataView":22,"./_Map":25,"./_Promise":27,"./_Set":28,"./_WeakMap":33,"./_baseGetTag":54,"./_toSource":163}],112:[function(t,e,r){e.exports=function(t,e){return null==t?void 0:t[e]}},{}],113:[function(t,e,r){var n=t("./_castPath"),o=t("./isArguments"),i=t("./isArray"),a=t("./_isIndex"),s=t("./isLength"),c=t("./_toKey");e.exports=function(t,e,r){for(var u=-1,f=(e=n(e,t)).length,l=!1;++u<f;){var p=c(e[u]);if(!(l=null!=t&&r(t,p)))break;t=t[p]}return l||++u!=f?l:!!(f=null==t?0:t.length)&&s(f)&&a(p,f)&&(i(t)||o(t))}},{"./_castPath":82,"./_isIndex":122,"./_toKey":162,"./isArguments":173,"./isArray":174,"./isLength":178}],114:[function(t,e,r){var n=t("./_nativeCreate");e.exports=function(){this.__data__=n?n(null):{},this.size=0}},{"./_nativeCreate":142}],115:[function(t,e,r){e.exports=function(t){var e=this.has(t)&&delete this.__data__[t];return this.size-=e?1:0,e}},{}],116:[function(t,e,r){var n=t("./_nativeCreate"),o="__lodash_hash_undefined__",i=Object.prototype.hasOwnProperty;e.exports=function(t){var e=this.__data__;if(n){var r=e[t];return r===o?void 0:r}return i.call(e,t)?e[t]:void 0}},{"./_nativeCreate":142}],117:[function(t,e,r){var n=t("./_nativeCreate"),o=Object.prototype.hasOwnProperty;e.exports=function(t){var e=this.__data__;return n?void 0!==e[t]:o.call(e,t)}},{"./_nativeCreate":142}],118:[function(t,e,r){var n=t("./_nativeCreate"),o="__lodash_hash_undefined__";e.exports=function(t,e){var r=this.__data__;return this.size+=this.has(t)?0:1,r[t]=n&&void 0===e?o:e,this}},{"./_nativeCreate":142}],119:[function(t,e,r){var n=Object.prototype.hasOwnProperty;e.exports=function(t){var e=t.length,r=new t.constructor(e);return e&&"string"==typeof t[0]&&n.call(t,"index")&&(r.index=t.index,r.input=t.input),r}},{}],120:[function(t,e,r){var n=t("./_cloneArrayBuffer"),o=t("./_cloneDataView"),i=t("./_cloneRegExp"),a=t("./_cloneSymbol"),s=t("./_cloneTypedArray"),c="[object Boolean]",u="[object Date]",f="[object Map]",l="[object Number]",p="[object RegExp]",_="[object Set]",h="[object String]",y="[object Symbol]",d="[object ArrayBuffer]",b="[object DataView]",v="[object Float32Array]",g="[object Float64Array]",m="[object Int8Array]",j="[object Int16Array]",x="[object Int32Array]",w="[object Uint8Array]",A="[object Uint8ClampedArray]",O="[object Uint16Array]",E="[object Uint32Array]";e.exports=function(t,e,r){var T=t.constructor;switch(e){case d:return n(t);case c:case u:return new T(+t);case b:return o(t,r);case v:case g:case m:case j:case x:case w:case A:case O:case E:return s(t,r);case f:return new T;case l:case h:return new T(t);case p:return i(t);case _:return new T;case y:return a(t)}}},{"./_cloneArrayBuffer":83,"./_cloneDataView":85,"./_cloneRegExp":86,"./_cloneSymbol":87,"./_cloneTypedArray":88}],121:[function(t,e,r){var n=t("./_baseCreate"),o=t("./_getPrototype"),i=t("./_isPrototype");e.exports=function(t){return"function"!=typeof t.constructor||i(t)?{}:n(o(t))}},{"./_baseCreate":47,"./_getPrototype":107,"./_isPrototype":127}],122:[function(t,e,r){var n=9007199254740991,o=/^(?:0|[1-9]\d*)$/;e.exports=function(t,e){var r=typeof t;return!!(e=null==e?n:e)&&("number"==r||"symbol"!=r&&o.test(t))&&t>-1&&t%1==0&&t<e}},{}],123:[function(t,e,r){var n=t("./eq"),o=t("./isArrayLike"),i=t("./_isIndex"),a=t("./isObject");e.exports=function(t,e,r){if(!a(r))return!1;var s=typeof e;return!!("number"==s?o(r)&&i(e,r.length):"string"==s&&e in r)&&n(r[e],t)}},{"./_isIndex":122,"./eq":167,"./isArrayLike":175,"./isObject":182}],124:[function(t,e,r){var n=t("./isArray"),o=t("./isSymbol"),i=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,a=/^\w*$/;e.exports=function(t,e){if(n(t))return!1;var r=typeof t;return!("number"!=r&&"symbol"!=r&&"boolean"!=r&&null!=t&&!o(t))||a.test(t)||!i.test(t)||null!=e&&t in Object(e)}},{"./isArray":174,"./isSymbol":187}],125:[function(t,e,r){e.exports=function(t){var e=typeof t;return"string"==e||"number"==e||"symbol"==e||"boolean"==e?"__proto__"!==t:null===t}},{}],126:[function(t,e,r){var n,o=t("./_coreJsData"),i=(n=/[^.]+$/.exec(o&&o.keys&&o.keys.IE_PROTO||""))?"Symbol(src)_1."+n:"";e.exports=function(t){return!!i&&i in t}},{"./_coreJsData":93}],127:[function(t,e,r){var n=Object.prototype;e.exports=function(t){var e=t&&t.constructor;return t===("function"==typeof e&&e.prototype||n)}},{}],128:[function(t,e,r){var n=t("./isObject");e.exports=function(t){return t==t&&!n(t)}},{"./isObject":182}],129:[function(t,e,r){e.exports=function(){this.__data__=[],this.size=0}},{}],130:[function(t,e,r){var n=t("./_assocIndexOf"),o=Array.prototype.splice;e.exports=function(t){var e=this.__data__,r=n(e,t);return!(r<0||(r==e.length-1?e.pop():o.call(e,r,1),--this.size,0))}},{"./_assocIndexOf":42}],131:[function(t,e,r){var n=t("./_assocIndexOf");e.exports=function(t){var e=this.__data__,r=n(e,t);return r<0?void 0:e[r][1]}},{"./_assocIndexOf":42}],132:[function(t,e,r){var n=t("./_assocIndexOf");e.exports=function(t){return n(this.__data__,t)>-1}},{"./_assocIndexOf":42}],133:[function(t,e,r){var n=t("./_assocIndexOf");e.exports=function(t,e){var r=this.__data__,o=n(r,t);return o<0?(++this.size,r.push([t,e])):r[o][1]=e,this}},{"./_assocIndexOf":42}],134:[function(t,e,r){var n=t("./_Hash"),o=t("./_ListCache"),i=t("./_Map");e.exports=function(){this.size=0,this.__data__={hash:new n,map:new(i||o),string:new n}}},{"./_Hash":23,"./_ListCache":24,"./_Map":25}],135:[function(t,e,r){var n=t("./_getMapData");e.exports=function(t){var e=n(this,t).delete(t);return this.size-=e?1:0,e}},{"./_getMapData":104}],136:[function(t,e,r){var n=t("./_getMapData");e.exports=function(t){return n(this,t).get(t)}},{"./_getMapData":104}],137:[function(t,e,r){var n=t("./_getMapData");e.exports=function(t){return n(this,t).has(t)}},{"./_getMapData":104}],138:[function(t,e,r){var n=t("./_getMapData");e.exports=function(t,e){var r=n(this,t),o=r.size;return r.set(t,e),this.size+=r.size==o?0:1,this}},{"./_getMapData":104}],139:[function(t,e,r){e.exports=function(t){var e=-1,r=Array(t.size);return t.forEach(function(t,n){r[++e]=[n,t]}),r}},{}],140:[function(t,e,r){e.exports=function(t,e){return function(r){return null!=r&&r[t]===e&&(void 0!==e||t in Object(r))}}},{}],141:[function(t,e,r){var n=t("./memoize"),o=500;e.exports=function(t){var e=n(t,function(t){return r.size===o&&r.clear(),t}),r=e.cache;return e}},{"./memoize":192}],142:[function(t,e,r){var n=t("./_getNative")(Object,"create");e.exports=n},{"./_getNative":106}],143:[function(t,e,r){var n=t("./_overArg")(Object.keys,Object);e.exports=n},{"./_overArg":147}],144:[function(t,e,r){e.exports=function(t){var e=[];if(null!=t)for(var r in Object(t))e.push(r);return e}},{}],145:[function(t,e,r){var n=t("./_freeGlobal"),o="object"==typeof r&&r&&!r.nodeType&&r,i=o&&"object"==typeof e&&e&&!e.nodeType&&e,a=i&&i.exports===o&&n.process,s=function(){try{var t=i&&i.require&&i.require("util").types;return t||a&&a.binding&&a.binding("util")}catch(t){}}();e.exports=s},{"./_freeGlobal":101}],146:[function(t,e,r){var n=Object.prototype.toString;e.exports=function(t){return n.call(t)}},{}],147:[function(t,e,r){e.exports=function(t,e){return function(r){return t(e(r))}}},{}],148:[function(t,e,r){var n=t("./_apply"),o=Math.max;e.exports=function(t,e,r){return e=o(void 0===e?t.length-1:e,0),function(){for(var i=arguments,a=-1,s=o(i.length-e,0),c=Array(s);++a<s;)c[a]=i[e+a];a=-1;for(var u=Array(e+1);++a<e;)u[a]=i[a];return u[e]=r(c),n(t,this,u)}}},{"./_apply":34}],149:[function(t,e,r){var n=t("./_freeGlobal"),o="object"==typeof self&&self&&self.Object===Object&&self,i=n||o||Function("return this")();e.exports=i},{"./_freeGlobal":101}],150:[function(t,e,r){var n="__lodash_hash_undefined__";e.exports=function(t){return this.__data__.set(t,n),this}},{}],151:[function(t,e,r){e.exports=function(t){return this.__data__.has(t)}},{}],152:[function(t,e,r){e.exports=function(t){var e=-1,r=Array(t.size);return t.forEach(function(t){r[++e]=t}),r}},{}],153:[function(t,e,r){var n=t("./_baseSetToString"),o=t("./_shortOut")(n);e.exports=o},{"./_baseSetToString":75,"./_shortOut":154}],154:[function(t,e,r){var n=800,o=16,i=Date.now;e.exports=function(t){var e=0,r=0;return function(){var a=i(),s=o-(a-r);if(r=a,s>0){if(++e>=n)return arguments[0]}else e=0;return t.apply(void 0,arguments)}}},{}],155:[function(t,e,r){var n=t("./_ListCache");e.exports=function(){this.__data__=new n,this.size=0}},{"./_ListCache":24}],156:[function(t,e,r){e.exports=function(t){var e=this.__data__,r=e.delete(t);return this.size=e.size,r}},{}],157:[function(t,e,r){e.exports=function(t){return this.__data__.get(t)}},{}],158:[function(t,e,r){e.exports=function(t){return this.__data__.has(t)}},{}],159:[function(t,e,r){var n=t("./_ListCache"),o=t("./_Map"),i=t("./_MapCache"),a=200;e.exports=function(t,e){var r=this.__data__;if(r instanceof n){var s=r.__data__;if(!o||s.length<a-1)return s.push([t,e]),this.size=++r.size,this;r=this.__data__=new i(s)}return r.set(t,e),this.size=r.size,this}},{"./_ListCache":24,"./_Map":25,"./_MapCache":26}],160:[function(t,e,r){e.exports=function(t,e,r){for(var n=r-1,o=t.length;++n<o;)if(t[n]===e)return n;return-1}},{}],161:[function(t,e,r){var n=t("./_memoizeCapped"),o=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,i=/\\(\\)?/g,a=n(function(t){var e=[];return 46===t.charCodeAt(0)&&e.push(""),t.replace(o,function(t,r,n,o){e.push(n?o.replace(i,"$1"):r||t)}),e});e.exports=a},{"./_memoizeCapped":141}],162:[function(t,e,r){var n=t("./isSymbol"),o=1/0;e.exports=function(t){if("string"==typeof t||n(t))return t;var e=t+"";return"0"==e&&1/t==-o?"-0":e}},{"./isSymbol":187}],163:[function(t,e,r){var n=Function.prototype.toString;e.exports=function(t){if(null!=t){try{return n.call(t)}catch(t){}try{return t+""}catch(t){}}return""}},{}],164:[function(t,e,r){var n=t("./_assignValue"),o=t("./_copyObject"),i=t("./_createAssigner"),a=t("./isArrayLike"),s=t("./_isPrototype"),c=t("./keys"),u=Object.prototype.hasOwnProperty,f=i(function(t,e){if(s(e)||a(e))o(e,c(e),t);else for(var r in e)u.call(e,r)&&n(t,r,e[r])});e.exports=f},{"./_assignValue":41,"./_copyObject":90,"./_createAssigner":94,"./_isPrototype":127,"./isArrayLike":175,"./keys":189}],165:[function(t,e,r){var n=t("./_baseClone"),o=4;e.exports=function(t){return n(t,o)}},{"./_baseClone":46}],166:[function(t,e,r){e.exports=function(t){return function(){return t}}},{}],167:[function(t,e,r){e.exports=function(t,e){return t===e||t!=t&&e!=e}},{}],168:[function(t,e,r){var n=t("./_arrayEach"),o=t("./_baseEach"),i=t("./_castFunction"),a=t("./isArray");e.exports=function(t,e){return(a(t)?n:o)(t,i(e))}},{"./_arrayEach":35,"./_baseEach":48,"./_castFunction":81,"./isArray":174}],169:[function(t,e,r){var n=t("./_baseGet");e.exports=function(t,e,r){var o=null==t?void 0:n(t,e);return void 0===o?r:o}},{"./_baseGet":52}],170:[function(t,e,r){var n=t("./_baseHasIn"),o=t("./_hasPath");e.exports=function(t,e){return null!=t&&o(t,e,n)}},{"./_baseHasIn":55,"./_hasPath":113}],171:[function(t,e,r){e.exports=function(t){return t}},{}],172:[function(t,e,r){var n=t("./_baseIndexOf"),o=t("./isArrayLike"),i=t("./isString"),a=t("./toInteger"),s=t("./values"),c=Math.max;e.exports=function(t,e,r,u){t=o(t)?t:s(t),r=r&&!u?a(r):0;var f=t.length;return r<0&&(r=c(f+r,0)),i(t)?r<=f&&t.indexOf(e,r)>-1:!!f&&n(t,e,r)>-1}},{"./_baseIndexOf":56,"./isArrayLike":175,"./isString":186,"./toInteger":197,"./values":200}],173:[function(t,e,r){var n=t("./_baseIsArguments"),o=t("./isObjectLike"),i=Object.prototype,a=i.hasOwnProperty,s=i.propertyIsEnumerable,c=n(function(){return arguments}())?n:function(t){return o(t)&&a.call(t,"callee")&&!s.call(t,"callee")};e.exports=c},{"./_baseIsArguments":57,"./isObjectLike":183}],174:[function(t,e,r){var n=Array.isArray;e.exports=n},{}],175:[function(t,e,r){var n=t("./isFunction"),o=t("./isLength");e.exports=function(t){return null!=t&&o(t.length)&&!n(t)}},{"./isFunction":177,"./isLength":178}],176:[function(t,e,r){var n=t("./_root"),o=t("./stubFalse"),i="object"==typeof r&&r&&!r.nodeType&&r,a=i&&"object"==typeof e&&e&&!e.nodeType&&e,s=a&&a.exports===i?n.Buffer:void 0,c=(s?s.isBuffer:void 0)||o;e.exports=c},{"./_root":149,"./stubFalse":195}],177:[function(t,e,r){var n=t("./_baseGetTag"),o=t("./isObject"),i="[object AsyncFunction]",a="[object Function]",s="[object GeneratorFunction]",c="[object Proxy]";e.exports=function(t){if(!o(t))return!1;var e=n(t);return e==a||e==s||e==i||e==c}},{"./_baseGetTag":54,"./isObject":182}],178:[function(t,e,r){var n=9007199254740991;e.exports=function(t){return"number"==typeof t&&t>-1&&t%1==0&&t<=n}},{}],179:[function(t,e,r){var n=t("./_baseIsMap"),o=t("./_baseUnary"),i=t("./_nodeUtil"),a=i&&i.isMap,s=a?o(a):n;e.exports=s},{"./_baseIsMap":60,"./_baseUnary":78,"./_nodeUtil":145}],180:[function(t,e,r){e.exports=function(t){return null==t}},{}],181:[function(t,e,r){var n=t("./_baseGetTag"),o=t("./isObjectLike"),i="[object Number]";e.exports=function(t){return"number"==typeof t||o(t)&&n(t)==i}},{"./_baseGetTag":54,"./isObjectLike":183}],182:[function(t,e,r){e.exports=function(t){var e=typeof t;return null!=t&&("object"==e||"function"==e)}},{}],183:[function(t,e,r){e.exports=function(t){return null!=t&&"object"==typeof t}},{}],184:[function(t,e,r){var n=t("./_baseGetTag"),o=t("./_getPrototype"),i=t("./isObjectLike"),a="[object Object]",s=Function.prototype,c=Object.prototype,u=s.toString,f=c.hasOwnProperty,l=u.call(Object);e.exports=function(t){if(!i(t)||n(t)!=a)return!1;var e=o(t);if(null===e)return!0;var r=f.call(e,"constructor")&&e.constructor;return"function"==typeof r&&r instanceof r&&u.call(r)==l}},{"./_baseGetTag":54,"./_getPrototype":107,"./isObjectLike":183}],185:[function(t,e,r){var n=t("./_baseIsSet"),o=t("./_baseUnary"),i=t("./_nodeUtil"),a=i&&i.isSet,s=a?o(a):n;e.exports=s},{"./_baseIsSet":64,"./_baseUnary":78,"./_nodeUtil":145}],186:[function(t,e,r){var n=t("./_baseGetTag"),o=t("./isArray"),i=t("./isObjectLike"),a="[object String]";e.exports=function(t){return"string"==typeof t||!o(t)&&i(t)&&n(t)==a}},{"./_baseGetTag":54,"./isArray":174,"./isObjectLike":183}],187:[function(t,e,r){var n=t("./_baseGetTag"),o=t("./isObjectLike"),i="[object Symbol]";e.exports=function(t){return"symbol"==typeof t||o(t)&&n(t)==i}},{"./_baseGetTag":54,"./isObjectLike":183}],188:[function(t,e,r){var n=t("./_baseIsTypedArray"),o=t("./_baseUnary"),i=t("./_nodeUtil"),a=i&&i.isTypedArray,s=a?o(a):n;e.exports=s},{"./_baseIsTypedArray":65,"./_baseUnary":78,"./_nodeUtil":145}],189:[function(t,e,r){var n=t("./_arrayLikeKeys"),o=t("./_baseKeys"),i=t("./isArrayLike");e.exports=function(t){return i(t)?n(t):o(t)}},{"./_arrayLikeKeys":37,"./_baseKeys":67,"./isArrayLike":175}],190:[function(t,e,r){var n=t("./_arrayLikeKeys"),o=t("./_baseKeysIn"),i=t("./isArrayLike");e.exports=function(t){return i(t)?n(t,!0):o(t)}},{"./_arrayLikeKeys":37,"./_baseKeysIn":68,"./isArrayLike":175}],191:[function(t,e,r){var n=t("./_arrayMap"),o=t("./_baseIteratee"),i=t("./_baseMap"),a=t("./isArray");e.exports=function(t,e){return(a(t)?n:i)(t,o(e,3))}},{"./_arrayMap":38,"./_baseIteratee":66,"./_baseMap":69,"./isArray":174}],192:[function(t,e,r){var n=t("./_MapCache"),o="Expected a function";function i(t,e){if("function"!=typeof t||null!=e&&"function"!=typeof e)throw new TypeError(o);var r=function(){var n=arguments,o=e?e.apply(this,n):n[0],i=r.cache;if(i.has(o))return i.get(o);var a=t.apply(this,n);return r.cache=i.set(o,a)||i,a};return r.cache=new(i.Cache||n),r}i.Cache=n,e.exports=i},{"./_MapCache":26}],193:[function(t,e,r){var n=t("./_baseProperty"),o=t("./_basePropertyDeep"),i=t("./_isKey"),a=t("./_toKey");e.exports=function(t){return i(t)?n(a(t)):o(t)}},{"./_baseProperty":72,"./_basePropertyDeep":73,"./_isKey":124,"./_toKey":162}],194:[function(t,e,r){e.exports=function(){return[]}},{}],195:[function(t,e,r){e.exports=function(){return!1}},{}],196:[function(t,e,r){var n=t("./toNumber"),o=1/0,i=1.7976931348623157e308;e.exports=function(t){return t?(t=n(t))===o||t===-o?(t<0?-1:1)*i:t==t?t:0:0===t?t:0}},{"./toNumber":198}],197:[function(t,e,r){var n=t("./toFinite");e.exports=function(t){var e=n(t),r=e%1;return e==e?r?e-r:e:0}},{"./toFinite":196}],198:[function(t,e,r){var n=t("./isObject"),o=t("./isSymbol"),i=NaN,a=/^\s+|\s+$/g,s=/^[-+]0x[0-9a-f]+$/i,c=/^0b[01]+$/i,u=/^0o[0-7]+$/i,f=parseInt;e.exports=function(t){if("number"==typeof t)return t;if(o(t))return i;if(n(t)){var e="function"==typeof t.valueOf?t.valueOf():t;t=n(e)?e+"":e}if("string"!=typeof t)return 0===t?t:+t;t=t.replace(a,"");var r=c.test(t);return r||u.test(t)?f(t.slice(2),r?2:8):s.test(t)?i:+t}},{"./isObject":182,"./isSymbol":187}],199:[function(t,e,r){var n=t("./_baseToString");e.exports=function(t){return null==t?"":n(t)}},{"./_baseToString":77}],200:[function(t,e,r){var n=t("./_baseValues"),o=t("./keys");e.exports=function(t){return null==t?[]:n(t,o(t))}},{"./_baseValues":79,"./keys":189}],201:[function(t,e,r){var n=t("trim"),o=t("for-each");e.exports=function(t){if(!t)return{};var e={};return o(n(t).split("\n"),function(t){var r,o=t.indexOf(":"),i=n(t.slice(0,o)).toLowerCase(),a=n(t.slice(o+1));void 0===e[i]?e[i]=a:(r=e[i],"[object Array]"===Object.prototype.toString.call(r)?e[i].push(a):e[i]=[e[i],a])}),e}},{"for-each":19,trim:202}],202:[function(t,e,r){(r=e.exports=function(t){return t.replace(/^\s*|\s*$/g,"")}).left=function(t){return t.replace(/^\s*/,"")},r.right=function(t){return t.replace(/\s*$/,"")}},{}],203:[function(t,e,r){"use strict";var n=t("global/window"),o=t("is-function"),i=t("parse-headers"),a=t("xtend");function s(t,e,r){var n=t;return o(e)?(r=e,"string"==typeof t&&(n={uri:t})):n=a(e,{uri:t}),n.callback=r,n}function c(t,e,r){return u(e=s(t,e,r))}function u(t){if(void 0===t.callback)throw new Error("callback argument missing");var e=!1,r=function(r,n,o){e||(e=!0,t.callback(r,n,o))};function n(){var t=void 0;if(t=f.response?f.response:f.responseText||function(t){if("document"===t.responseType)return t.responseXML;var e=204===t.status&&t.responseXML&&"parsererror"===t.responseXML.documentElement.nodeName;if(""===t.responseType&&!e)return t.responseXML;return null}(f),b)try{t=JSON.parse(t)}catch(t){}return t}function o(t){return clearTimeout(l),t instanceof Error||(t=new Error(""+(t||"Unknown XMLHttpRequest Error"))),t.statusCode=0,r(t,v)}function a(){if(!u){var e;clearTimeout(l),e=t.useXDR&&void 0===f.status?200:1223===f.status?204:f.status;var o=v,a=null;return 0!==e?(o={body:n(),statusCode:e,method:_,headers:{},url:p,rawRequest:f},f.getAllResponseHeaders&&(o.headers=i(f.getAllResponseHeaders()))):a=new Error("Internal XMLHttpRequest Error"),r(a,o,o.body)}}var s,u,f=t.xhr||null;f||(f=t.cors||t.useXDR?new c.XDomainRequest:new c.XMLHttpRequest);var l,p=f.url=t.uri||t.url,_=f.method=t.method||"GET",h=t.body||t.data,y=f.headers=t.headers||{},d=!!t.sync,b=!1,v={body:void 0,headers:{},statusCode:0,method:_,url:p,rawRequest:f};if("json"in t&&!1!==t.json&&(b=!0,y.accept||y.Accept||(y.Accept="application/json"),"GET"!==_&&"HEAD"!==_&&(y["content-type"]||y["Content-Type"]||(y["Content-Type"]="application/json"),h=JSON.stringify(!0===t.json?h:t.json))),f.onreadystatechange=function(){4===f.readyState&&a()},f.onload=a,f.onerror=o,f.onprogress=function(){},f.onabort=function(){u=!0},f.ontimeout=o,f.open(_,p,!d,t.username,t.password),d||(f.withCredentials=!!t.withCredentials),!d&&t.timeout>0&&(l=setTimeout(function(){if(!u){u=!0,f.abort("timeout");var t=new Error("XMLHttpRequest timeout");t.code="ETIMEDOUT",o(t)}},t.timeout)),f.setRequestHeader)for(s in y)y.hasOwnProperty(s)&&f.setRequestHeader(s,y[s]);else if(t.headers&&!function(t){for(var e in t)if(t.hasOwnProperty(e))return!1;return!0}(t.headers))throw new Error("Headers cannot be set on an XDomainRequest object");return"responseType"in t&&(f.responseType=t.responseType),"beforeSend"in t&&"function"==typeof t.beforeSend&&t.beforeSend(f),f.send(h||null),f}e.exports=c,c.XMLHttpRequest=n.XMLHttpRequest||function(){},c.XDomainRequest="withCredentials"in new c.XMLHttpRequest?c.XMLHttpRequest:n.XDomainRequest,function(t,e){for(var r=0;r<t.length;r++)e(t[r])}(["get","put","post","patch","head","delete"],function(t){c["delete"===t?"del":t]=function(e,r,n){return(r=s(e,r,n)).method=t.toUpperCase(),u(r)}})},{"global/window":20,"is-function":21,"parse-headers":201,xtend:204}],204:[function(t,e,r){e.exports=function(){for(var t={},e=0;e<arguments.length;e++){var r=arguments[e];for(var o in r)n.call(r,o)&&(t[o]=r[o])}return t};var n=Object.prototype.hasOwnProperty},{}],airtable:[function(t,e,r){var n=t("./base"),o=t("./record"),i=t("./table"),a=t("./airtable_error");function s(t){t=t||{};var e=s.default_config(),r=t.apiVersion||s.apiVersion||e.apiVersion;if(Object.defineProperties(this,{_apiKey:{value:t.apiKey||s.apiKey||e.apiKey},_endpointUrl:{value:t.endpointUrl||s.endpointUrl||e.endpointUrl},_apiVersion:{value:r},_apiVersionMajor:{value:r.split(".")[0]},_noRetryIfRateLimited:{value:t.noRetryIfRateLimited||s.noRetryIfRateLimited||e.noRetryIfRateLimited}}),this.requestTimeout=t.requestTimeout||e.requestTimeout,!this._apiKey)throw new Error("An API key is required to connect to Airtable")}s.prototype.base=function(t){return n.createFunctor(this,t)},s.default_config=function(){return{endpointUrl:"https://api.airtable.com",apiVersion:"0.1.0",apiKey:void 0,noRetryIfRateLimited:!1,requestTimeout:3e5}},s.configure=function(t){s.apiKey=t.apiKey,s.endpointUrl=t.endpointUrl,s.apiVersion=t.apiVersion,s.noRetryIfRateLimited=t.noRetryIfRateLimited},s.base=function(t){return(new s).base(t)},s.Base=n,s.Record=o,s.Table=i,s.Error=a,e.exports=s},{"./airtable_error":1,"./base":2,"./record":13,"./table":15}]},{},["airtable"]);
/*
Project Name: SPIKE Prime Web Interface
File name: ServiceDock_SPIKE.js
Author: Jeremy Jung
Last update: 11/5/2020
Description: HTML Element definition for <service-spike> to be used in ServiceDocks
Credits/inspirations:
History:
    Created by Jeremy on 7/16/20
    Fixed baudRate by Teddy on 10/11/20
LICENSE: MIT
(C) Tufts Center for Engineering Education and Outreach (CEEO)
TODO:
include bluetooth_button and main_button in PrimeHub() SPIKE APP functions
Remove all instances of getPortsInfo in example codes
implement get_color
*/

// import { Service_SPIKE } from "./Service_SPIKE.js";

class servicespike extends HTMLElement {   

    constructor () {
        super();

        var active = false; // whether the service was activated
        this.service = new Service_SPIKE(); // instantiate a service object ( one object per button )

        this.service.executeAfterDisconnect(function () {
            active = false;
            status.style.backgroundColor = "red";
        })

        // Create a shadow root
        var shadow = this.attachShadow({ mode: 'open' });

        /* wrapper definition and CSS */

        var wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'wrapper');
        wrapper.setAttribute("style", "width: 50px; height: 50px; position: relative; margin-top: 10px;")

        /* ServiceDock button definition and CSS */ 

        var button = document.createElement("button");
        button.setAttribute("id", "sl_button");
        button.setAttribute("class", "SD_button");

        var imageRelPath = "./modules/views/SPIKE_button.png" // relative to the document in which a servicespike is created ( NOT this file )
        var length = 50; // for width and height of button
        var buttonBackgroundColor = "#A2E1EF" // background color of the button
        var buttonStyle = "width:" + length + "px; height:" + length + "px; background: url(" + imageRelPath + ") no-repeat; background-size: 50px 50px; background-color:" + buttonBackgroundColor
            + "; border: none; background-position: center; cursor: pointer; border-radius: 10px; position: relative; margin: 4px 0px; "
        button.setAttribute("style", buttonStyle);

        /* status circle definition and CSS */

        this.status = document.createElement("div");
        this.status.setAttribute("class", "status");
        var length = 20; // for width and height of circle
        var statusBackgroundColor = "red" // default background color of service (inactive color)
        var posLeft = 30;
        var posTop = 20;
        var statusStyle = "border-radius: 50%; height:" + length + "px; width:" + length + "px; background-color:" + statusBackgroundColor +
            "; position: relative; left:" + posLeft + "px; top:" + posTop + "px;";
        this.status.setAttribute("style", statusStyle);

        /* event listeners */
        
        button.addEventListener("mouseleave", function (event) {
            button.style.backgroundColor = "#A2E1EF";
            button.style.color = "#000000";
        });

        button.addEventListener("mouseenter", function (event) {
            button.style.backgroundColor = "#FFFFFF";
            button.style.color = "#000000";
        })

        // when ServiceDock button is double clicked
        this.addEventListener("click", async function () {
            // check active flag so once activated, the service doesnt reinit
            if (!active) {
                console.log("%cTuftsCEEO ", "color: #3ba336;", "activating service");
                var initSuccessful = await this.service.init();
                if (initSuccessful) {
                    active = true;
                    this.status.style.backgroundColor = "green";
                }
            } 
        });


        shadow.appendChild(wrapper);
        button.appendChild(this.status);
        wrapper.appendChild(button);

    }

    /* get the Service_SPIKE object */
    getService() {
        return this.service;
    }

    /* get whether the ServiceDock button was clicked */
    getClicked() {
        return this.active;
    }

}

// when defining custom element, the name must have at least one - dash 
window.customElements.define('service-spike', servicespike);

/*
Project Name: SPIKE Prime Web Interface
File name: Service_SPIKE.js
Author: Jeremy Jung
Last update: 7/22/20
Description: SPIKE Service Library (OOP)
Credits/inspirations:
    Based on code wrriten by Ethan Danahy, Chris Rogers
History:
    Created by Jeremy on 7/15/20
LICENSE: MIT
(C) Tufts Center for Engineering Education and Outreach (CEEO)
*/


/**
 * @class Service_SPIKE 
 * @classdesc
 * ServiceDock library for interfacing with LEGO® SPIKE™ Prime
 * @example
 * // if you're using ServiceDock 
 * var mySPIKE = document.getElemenyById("service_spike").getService();
 * mySPIKE.executeAfterInit(async function() {
 *     // write code here
 * })
 * 
 * // if you're not using ServiceDock
 * var mySPIKE = new Service_SPIKE();
 * mySPIKE.init();
 * 
 * 
 */
function Service_SPIKE() {

    //////////////////////////////////////////
    //                                      //
    //          Global Variables            //
    //                                      //
    //////////////////////////////////////////

    /* private members */

    const VENDOR_ID = 0x0694; // LEGO SPIKE Prime Hub

    // common characters to send (for REPL/uPython on the Hub)
    const CONTROL_C = '\x03'; // CTRL-C character (ETX character)
    const CONTROL_D = '\x04'; // CTRL-D character (EOT character)
    const RETURN = '\x0D';	// RETURN key (enter, new line)

    /* using this filter in webserial setup will only take serial ports*/
    const filter = {
        usbVendorId: VENDOR_ID

    };

    // define for communication
    let port;
    let reader;
    let writer;
    let value;
    let done;
    let writableStreamClosed;

    //define for json concatenation
    let jsonline = "";

    // contains latest full json object from SPIKE readings
    let lastUJSONRPC;

    // object containing real-time info on devices connected to each port of SPIKE Prime 
    let ports =
    {
        "A": { "device": "none", "data": {} },
        "B": { "device": "none", "data": {} },
        "C": { "device": "none", "data": {} },
        "D": { "device": "none", "data": {} },
        "E": { "device": "none", "data": {} },
        "F": { "device": "none", "data": {} }
    };

    // object containing real-time info on hub sensor values
    /*
        !say the usb wire is the nose of the spike prime

        ( looks at which side of the hub is facing up)
        gyro[0] - up/down detector ( down: 1000, up: -1000, neutral: 0)
        gyro[1] - rightside/leftside detector ( leftside : 1000 , rightside: -1000, neutal: 0 )
        gyro[2] - front/back detector ( front: 1000, back: -1000, neutral: 0 )

        ( assume the usb wire port is the nose of the spike prime )
        accel[0] - roll acceleration (roll to right: -, roll to left: +)
        accel[1] - pitch acceleration (up: +, down: -)
        accel[2] - yaw acceleration (counterclockwise: +. clockwise: -)

        ()
        pos[0] - yaw angle
        pos[1] - pitch angle
        pos[2] - roll angle

    */
    let hub =
    {
        "gyro": [0, 0, 0],
        "accel": [0, 0, 0],
        "pos": [0, 0, 0]
    }

    let batteryAmount = 0; // battery [0-100]

    // string containing real-time info on hub events
    let hubFrontEvent;

    /*
        up: hub is upright/standing, with the display looking horizontally
        down: hub is upsidedown with the display, with the display looking horizontally
        front: hub's display facing towards the sky
        back: hub's display facing towards the earth
        leftside: hub rotated so that the side to the left of the display is facing the earth
        rightside: hub rotated so that the side to the right of the display is facing the earth
    */
    let lastHubOrientation; //PrimeHub orientation read from caught UJSONRPC 

    /*
        shake
        freefall
    */
    let hubGesture;

    // 
    let hubMainButton = { "pressed": false, "duration": 0 };

    let hubBluetoothButton = { "pressed": false, "duration": 0 };

    let hubLeftButton = { "pressed": false, "duration": 0 };

    let hubRightButton = { "pressed": false, "duration": 0 };

    /* PrimeHub data storage arrays for was_***() functions */
    let hubGestures = []; // array of hubGestures run since program started or since was_gesture() ran
    let hubButtonPresses = [];
    let hubName = undefined;

    /* SPIKE Prime Projects */

    let hubProjects = {
        "0": "None",
        "1": "None",
        "2": "None",
        "3": "None",
        "4": "None",
        "5": "None",
        "6": "None",
        "7": "None",
        "8": "None",
        "9": "None",
        "10": "None",
        "11": "None",
        "12": "None",
        "13": "None",
        "14": "None",
        "15": "None",
        "16": "None",
        "17": "None",
        "18": "None",
        "19": "None"
    };

    var colorDictionary = {
        0: "BLACK",
        1: "VIOLET",
        3: "BLUE",
        4: "AZURE",
        5: "GREEN",
        7: "YELLOW",
        9: "RED",
        1: "WHITE",
    };

    // true after Force Sensor is pressed, turned to false after reading it for the first time that it is released
    let ForceSensorWasPressed = false;

    var micropython_interpreter = false; // whether micropython was reached or not

    let serviceActive = false; //serviceActive flag

    var waitForNewOriFirst = true; //whether the wait_for_new_orientation method would be the first time called

    /* stored callback functions from wait_until functions and etc. */

    var funcAtInit = undefined; // function to call after init of SPIKE Service

    var funcAfterNewGesture = undefined;
    var funcAfterNewOrientation = undefined;

    var funcAfterLeftButtonPress = undefined;
    var funcAfterLeftButtonRelease = undefined;
    var funcAfterRightButtonPress = undefined;
    var funcAfterRightButtonRelease = undefined;

    var funcUntilColor = undefined;
    var funcAfterNewColor = undefined;

    var funcAfterForceSensorPress = undefined;
    var funcAfterForceSensorRelease = undefined;

    /* array that holds the pointers to callback functions to be executed after a UJSONRPC response */
    var responseCallbacks = [];

    // array of information needed for writing program
    var startWriteProgramCallback = undefined; // [message_id, function to execute ]
    var writePackageInformation = undefined; // [ message_id, remaining_data, transfer_id, blocksize]
    var writeProgramCallback = undefined; // callback function to run after a program was successfully written
    var writeProgramSetTimeout = undefined; // setTimeout object for looking for response to start_write_program

    /* callback functions added for Coding Rooms */
    
    var getFirmwareInfoCallback = undefined;

    var funcAfterPrint = undefined; // function to call for SPIKE python program print statements or errors
    var funcAfterError = undefined; // function to call for errors in ServiceDock

    var funcAfterDisconnect = undefined; // function to call after SPIKE Prime is disconnected

    var funcWithStream = undefined; // function to call after every parsed UJSONRPC package

    var triggerCurrentStateCallback = undefined;

    //////////////////////////////////////////
    //                                      //
    //          Public Functions            //
    //                                      //
    //////////////////////////////////////////

    /**  initialize SPIKE_service
     * <p> Makes prompt in Google Chrome ( Google Chrome Browser needs "Experimental Web Interface" enabled) </p>
     * <p> Starts streaming UJSONRPC </p>
     * <p> <em> this function needs to be executed after executeAfterInit but before all other public functions </em> </p>
     * @public
     * @returns {boolean} True if service was successsfully initialized, false otherwise
     */
    async function init() {

        console.log("%cTuftsCEEO ", "color: #3ba336;", "navigator.product is ", navigator.product);
        console.log("%cTuftsCEEO ", "color: #3ba336;", "navigator.appName is ", navigator.appName);
        // reinit variables in the case of hardware disconnection and Service reactivation
        reader = undefined;
        writer = undefined;

        // initialize web serial connection
        var webSerialConnected = await initWebSerial();

        if (webSerialConnected) {

            // start streaming UJSONRPC
            streamUJSONRPC();

            await sleep(1000);

            triggerCurrentState();
            serviceActive = true;

            await sleep(2000); // wait for service to init

            // call funcAtInit if defined
            if (funcAtInit !== undefined) {
                funcAtInit();
            }
            return true;
        }
        else {
            return false;
        }
    }

    /**  Get the callback function to execute after service is initialized.
     * <p> <em> This function needs to be executed before calling init() </em> </p>
     * @public
     * @param {function} callback Function to execute after initialization ( during init() )
     * @example
     * var motor = mySPIKE.Motor("A");
     * mySPIKE.executeAfterInit( async function () {
     *     var speed = await motor.get_speed();
     *     // do something with speed
     * })
     */
    function executeAfterInit(callback) {
        // Assigns global variable funcAtInit a pointer to callback function
        funcAtInit = callback;
    }

    /**  Get the callback function to execute after a print or error from SPIKE python program
     * @ignore
     * @param {function} callback 
     */
    function executeAfterPrint(callback) {
        funcAfterPrint = callback;
    }

    /**  Get the callback function to execute after Service Dock encounters an error
     * @ignore
     * @param {any} callback 
     */
    function executeAfterError(callback) {
        funcAfterError = callback;
    }


    /**  Execute a stack of functions continuously with SPIKE sensor feed
     * 
     * @public
     * @param {any} callback 
     * @example
     * var motor = new mySPIKE.Motor('A')
     * mySPIKE.executeWithStream( async function() {
     *      var speed = await motor.get_speed();
     *      // do something with motor speed
     * })
     */
    function executeWithStream(callback) {
        funcWithStream = callback;
    }

    /**  Get the callback function to execute after service is disconnected
     * @ignore
     * @param {any} callback 
     */
    function executeAfterDisconnect(callback) {
        funcAfterDisconnect = callback;
    }

    /**  Send command to the SPIKE Prime (UJSON RPC or Micropy depending on current interpreter)
     * <p> May make the SPIKE Prime do something </p>
     * @ignore
     * @param {string} command Command to send (or sequence of commands, separated by new lines)
     */
    async function sendDATA(command) {
        // look up the command to send
        var commands = command.split("\n"); // split on new line
        //commands = command
        console.log("%cTuftsCEEO ", "color: #3ba336;", "sendDATA: " + commands);

        // make sure ready to write to device
        setupWriter();

        // send it in micropy if micropy reached
        if (micropython_interpreter) {

            for (var i = 0; i < commands.length; i++) {
                // console.log("%cTuftsCEEO ", "color: #3ba336;", "commands.length", commands.length)

                // trim trailing, leading whitespaces
                var current = commands[i].trim();

                writer.write(current);
                writer.write(RETURN); // extra return at the end
            }
        }
        // expect json scripts if micropy not reached
        else {
            // go through each line of the command
            // trim it, send it, and send a return...
            for (var i = 0; i < commands.length; i++) {

                //console.log("%cTuftsCEEO ", "color: #3ba336;", "commands.length", commands.length)

                current = commands[i].trim();
                //console.log("%cTuftsCEEO ", "color: #3ba336;", "current", current);
                // turn string into JSON

                //string_current = (JSON.stringify(current));
                //myobj = JSON.parse(string_current);
                var myobj = await JSON.parse(current);

                // turn JSON back into string and write it out
                writer.write(JSON.stringify(myobj));
                writer.write(RETURN); // extra return at the end
            }
        }
    }


    /**  Send character sequences to reboot SPIKE Prime
     * <p> <em> Run this function to exit micropython interpreter </em> </p>
     * @public
     * @example
     * mySPIKE.rebootHub();
     */
    function rebootHub() {
        console.log("%cTuftsCEEO ", "color: #3ba336;", "rebooting")
        // make sure ready to write to device
        setupWriter();
        writer.write(CONTROL_C);
        writer.write(CONTROL_D);

        //toggle micropython_interpreter flag if its was active
        if (micropython_interpreter) {
            micropython_interpreter = false;
        }
    }

    /**  Get the information of all the ports and devices connected to them
     * @ignore
     * @returns {object} <p> An object with keys as port letters and values as objects of device type and info </p>
     * @example
     * // USAGE 
     * 
     * var portsInfo = await mySPIKE.getPortsInfo();
     * // ports.{yourPortLetter}.device --returns--> device type (ex. "smallMotor" or "ultrasonic") </p>
     * // ports.{yourPortLetter}.data --returns--> device info (ex. {"speed": 0, "angle":0, "uAngle": 0, "power":0} ) </p>
     * 
     * // Motor on port A
     * var motorSpeed = portsInfo["A"]["speed"]; // motor speed
     * var motorDegreesCounted = portsInfo["A"]["angle"]; // motor angle
     * var motorPosition = portsInfo["A"]["uAngle"]; // motor angle in unit circle ( -180 ~ 180 )
     * var motorPower = portsInfo["A"]["power"]; // motor power
     * 
     * // Ultrasonic Sensor on port A
     * var distance = portsInfo["A"]["distance"] // distance value from ultrasonic sensor
     * 
     * // Color Sensor on port A
     * var reflectedLight = portsInfo["A"]["reflected"]; // reflected light
     * var ambientLight = portsInfo["A"]["ambient"]; // ambient light
     * var RGB = portsInfo["A"]["RGB"]; // [R, G, B]
     * 
     * // Force Sensor on port A
     * var forceNewtons = portsInfo["A"]["force"]; // Force in Newtons ( 1 ~ 10 ) 
     * var pressedBool = portsInfo["A"]["pressed"] // whether pressed or not ( true or false )
     * var forceSensitive = portsInfo["A"]["forceSensitive"] // More sensitive force output( 0 ~ 900 )
     */
    async function getPortsInfo() {
        return ports;
    }

    /**  get the info of a single port
     * @ignore
     * @param {string} letter Port on the SPIKE hub
     * @returns {object} Keys as device and info as value
     */
    async function getPortInfo(letter) {
        return ports[letter];
    }

    /**  Get battery status
     * @ignore
     * @returns {integer} battery percentage
     */
    async function getBatteryStatus() {
        return batteryAmount;
    }

    /**  Get info of the hub
     * @ignore
     * @returns {object} Info of the hub
     * @example
     * var hubInfo = await mySPIKE.getHubInfo();
     * 
     * var upDownDetector = hubInfo["gyro"][0];
     * var rightSideLeftSideDetector = hubInfo["gyro"][1];
     * var frontBackDetector = hubInfo["gyro"][2];
     * 
     * var rollAcceleration = hubInfo["pos"][0];  
     * var pitchAcceleration = hubInfo["pos"][1]; 
     * var yawAcceleration = hubInfo["pos"][2];   
     * 
     * var yawAngle = hubInfo["pos"][0];
     * var pitchAngle = hubInfo["pos"][1];
     * var rollAngle = hubInfo["pos"][2];
     * 
     * 
     */
    async function getHubInfo() {
        return hub;
    }

    /**  Get the name of the hub
     * 
     * @public
     * @returns name of hub
     */
    async function getHubName() {
        return hubName;
    }

    /**
     * @ignore
     * @param {any} callback 
     */
    async function getFirmwareInfo(callback) {

        UJSONRPC.getFirmwareInfo(callback);

    }


    /**  get projects in all the slots of SPIKE Prime hub
     * 
     * @ignore
     * @returns {object}
     */
    async function getProjects() {

        UJSONRPC.getStorageStatus();

        await sleep(2000);

        return hubProjects
    }

    /**  Reach the micropython interpreter beneath UJSON RPC
     * <p> Note: Stops UJSON RPC stream </p>
     * <p> hub needs to be rebooted to return to UJSONRPC stream</p>
     * @ignore
     * @example
     * mySPIKE.reachMicroPy();
     * mySPIKE.sendDATA("from spike import PrimeHub");
     * mySPIKE.sendDATA("hub = PrimeHub()");
     * mySPIKE.sendDATA("hub.light_matrix.show_image('HAPPY')");
     */
    function reachMicroPy() {
        console.log("%cTuftsCEEO ", "color: #3ba336;", "starting micropy interpreter");
        setupWriter();
        writer.write(CONTROL_C);
        micropython_interpreter = true;
    }

    /**  Get the latest complete line of UJSON RPC from stream
     * @ignore
     * @returns {string} Represents a JSON object from UJSON RPC
     */
    async function getLatestUJSON() {

        try {
            var parsedUJSON = await JSON.parse(lastUJSONRPC)
        }
        catch (error) {
            //console.log("%cTuftsCEEO ", "color: #3ba336;", '[retrieveData] ERROR', error);
        }

        return lastUJSONRPC
    }

    /** Get whether the Service was initialized or not
     * @public
     * @returns {boolean} True if service initialized, false otherwise
     * @example
     * if (mySPIKE.isActive()) {
     *      // do something
     * }
     */
    function isActive() {
        return serviceActive;
    }

    /**  Get the most recently detected event on the display of the hub
     * @public
     * @returns {string} ['tapped','doubletapped']
     * var event = await mySPIKE.getHubEvent();
     * if (event == "tapped" ) {
     *      console.log("SPIKE is tapped");
     * }
     */
    async function getHubEvent() {
        return hubFrontEvent;
    }

    /**  Get the most recently detected gesture of the hub
     * @public
     * @returns {string} ['shake', 'freefall']
     * @example
     * var gesture = await mySPIKE.getHubGesture();
     * if (gesture == "shake") {
     *      console.log("SPIKE is being shaked");
     * }
     */
    async function getHubGesture() {
        return hubGesture;
    }

    /**  Get the most recently detected orientation of the hub
     * @public
     * @returns {string} ['up','down','front','back','leftside','rightside']
     * @example
     * var orientation = await mySPIKE.getHubOrientation();
     * if (orientation == "front") {
     *      console.log("SPIKE is facing up");
     * }
     */
    async function getHubOrientation() {
        return lastHubOrientation;
    }


    /**  Get the latest press event information on the "connect" button
     * @ignore
     * @returns {object} { "pressed": BOOLEAN, "duration": NUMBER } 
     * @example
     * var bluetoothButtonInfo = await mySPIKE.getBluetoothButton();
     * var pressedBool = bluetoothButtonInfo["pressed"];
     * var pressedDuration = bluetoothButtonInfo["duration"]; // duration is miliseconds the button was pressed until release
     */
    async function getBluetoothButton() {
        return hubBluetoothButton;
    }

    /**  Get the latest press event information on the "center" button
     * @ignore
     * @returns {object} { "pressed": BOOLEAN, "duration": NUMBER }
     * @example
     * var mainButtonInfo = await mySPIKE.getMainButton();
     * var pressedBool = mainButtonInfo["pressed"];
     * var pressedDuration = mainButtonInfo["duration"]; // duration is miliseconds the button was pressed until release
     * 
     */
    async function getMainButton() {
        return hubMainButton;
    }

    /**  Get the latest press event information on the "left" button
     * @ignore
     * @returns {object} { "pressed": BOOLEAN, "duration": NUMBER } 
     * @example
     * var leftButtonInfo = await mySPIKE.getLeftButton();
     * var pressedBool = leftButtonInfo["pressed"];
     * var pressedDuration = leftButtonInfo["duration"]; // duration is miliseconds the button was pressed until release
     * 
     */
    async function getLeftButton() {
        return hubLeftButton;
    }

    /**  Get the latest press event information on the "right" button
     * @ignore
     * @returns {object} { "pressed": BOOLEAN, "duration": NUMBER } 
     * @example
     * var rightButtonInfo = await mySPIKE.getRightButton();
     * var pressedBool = rightButtonInfo["pressed"];
     * var pressedDuration = rightButtonInfo["duration"]; // duration is miliseconds the button was pressed until release
     */
    async function getRightButton() {
        return hubRightButton;
    }

    /**  Get the letters of ports connected to any kind of Motors
     * @public
     * @returns {(string|Array)} Ports that are connected to Motors
     */
    async function getMotorPorts() {

        var portsInfo = ports;
        var motorPorts = [];
        for (var key in portsInfo) {
            if (portsInfo[key].device == "smallMotor" || portsInfo[key].device == "bigMotor") {
                motorPorts.push(key);
            }
        }
        return motorPorts;

    }

    /**  Get the letters of ports connected to Small Motors
     * @public
     * @returns {(string|Array)} Ports that are connected to Small Motors
     */
    async function getSmallMotorPorts() {

        var portsInfo = ports;
        var motorPorts = [];
        for (var key in portsInfo) {
            if (portsInfo[key].device == "smallMotor") {
                motorPorts.push(key);
            }
        }
        return motorPorts;

    }

    /**  Get the letters of ports connected to Big Motors
     * @public
     * @returns {(string|Array)} Ports that are connected to Big Motors
     */
    async function getBigMotorPorts() {
        var portsInfo = ports;
        var motorPorts = [];
        for (var key in portsInfo) {
            if (portsInfo[key].device == "bigMotor") {
                motorPorts.push(key);
            }
        }
        return motorPorts;
    }

    /**  Get the letters of ports connected to Distance Sensors
     * @public
     * @returns {(string|Array)} Ports that are connected to Distance Sensors
     */
    async function getUltrasonicPorts() {

        var portsInfo = await this.getPortsInfo();
        var ultrasonicPorts = [];

        for (var key in portsInfo) {
            if (portsInfo[key].device == "ultrasonic") {
                ultrasonicPorts.push(key);
            }
        }

        return ultrasonicPorts;

    }

    /**  Get the letters of ports connected to Color Sensors
     * @public
     * @returns {(string|Array)} Ports that are connected to Color Sensors
     */
    async function getColorPorts() {

        var portsInfo = await this.getPortsInfo();
        var colorPorts = [];

        for (var key in portsInfo) {
            if (portsInfo[key].device == "color") {
                colorPorts.push(key);
            }
        }

        return colorPorts;

    }

    /**  Get the letters of ports connected to Force Sensors
     * @public
     * @returns {(string|Array)} Ports that are connected to Force Sensors
     */
    async function getForcePorts() {

        var portsInfo = await this.getPortsInfo();
        var forcePorts = [];

        for (var key in portsInfo) {
            if (portsInfo[key].device == "force") {
                forcePorts.push(key);
            }
        }

        return forcePorts;

    }

    /**  Get all motor objects currently connected to SPIKE
     * 
     * @public
     * @returns {object} All connected Motor objects
     * @example
     * var motors = await mySPIKE.getMotors();
     * var myMotor = motors["A"]  
     */
    async function getMotors() {
        var portsInfo = ports;
        var motors = {};
        for (var key in portsInfo) {
            if (portsInfo[key].device == "smallMotor" || portsInfo[key].device == "bigMotor") {
                motors[key] = new Motor(key);
            }
        }
        return motors;
    }

    /**  Get all distance sensor objects currently connected to SPIKE
     * 
     * @public
     * @returns {object} All connected DistanceSensor objects
     * @example
     * var distanceSensors = await mySPIKE.getDistanceSensors();
     * var mySensor = distanceSensors["A"];
     */
    async function getDistanceSensors() {
        var portsInfo = ports;
        var distanceSensors = {};
        for (var key in portsInfo) {
            if (portsInfo[key].device == "ultrasonic") {
                distanceSensors[key] = new DistanceSensor(key);
            }
        }
        return distanceSensors;
    }

    /**  Get all color sensor objects currently connected to SPIKE
     * 
     * @public
     * @returns {object} All connected ColorSensor objects
     * @example
     * var colorSensors = await mySPIKE.getColorSensors();
     * var mySensor = colorSensors["A"];
     */
    async function getColorSensors() {
        var portsInfo = ports;
        var colorSensors = {};
        for (var key in portsInfo) {
            if (portsInfo[key].device == "color") {
                colorSensors[key] = new ColorSensor(key);
            }
        }
        return colorSensors;
    }

    /**  Get all force sensor objects currently connected to SPIKE
     * 
     * @public
     * @returns {object} All connected ForceSensor objects
     * @example
     * var forceSensors = await mySPIKE.getForceSensors();
     * var mySensor = forceSensors["A"];
     */
    async function getForceSensors() {
        var portsInfo = ports;
        var forceSensors = {};
        for (var key in portsInfo) {
            if (portsInfo[key].device == "force") {
                forceSensors[key] = new ForceSensor(key);
            }
        }
        return forceSensors;
    }


    /**  Terminate currently running micropy progra
     * @ignore
     */
    function stopCurrentProgram() {
        UJSONRPC.programTerminate();
    }

    /** Push micropython code that retrieves all JS global variables and local variables at the scope in which
     * this function was called
     * @public
     * @param {integer} slotid 
     * @param {string} program program to write must be in TEMPLATE LITERAL
     * @example
     * mySPIKE.micropython(10, `
     *from spike import PrimeHub, LightMatrix, Motor, MotorPair
     *from spike.control import wait_for_seconds, wait_until, Timer
     *
     *hub = PrimeHub()
     *
     *hub.light_matrix.write(run_for_seconds(2))
     *
     *run_for_seconds(3)
     * `)
     */
    function micropython(slotid, program) {
        // initialize microPyUtils
        micropyUtils.init();

        /* add local variables of the caller of this function */
        // get the function definition of caller
        /* parse and add all local variable declarations to micropyUtils.storedVariables
    
        var aString = "hi" or var aString = 'hi' > {aString: "hi"}
    
        */
        var thisFunction = arguments.callee.caller.toString();

        // split function scope by newlines
        var newLineRule = /\n/g
        var arrayLines = thisFunction.split(newLineRule);

        // filter lines that dont contain var, or contains function
        var arrayVarLines = [];
        for (var index in arrayLines) {
            if (arrayLines[index].indexOf("var") > -1) {
                // filter out functions and objects
                if (arrayLines[index].indexOf("function") == -1 && arrayLines[index].indexOf("{") == -1 && arrayLines[index].indexOf("}") == -1) {
                    arrayVarLines.push(arrayLines[index]);
                }
            }
        }

        var parseRule = /[[ ]/g
        for (var index in arrayVarLines) {
            // process line
            var processedLine = micropyUtils.processString(arrayVarLines[index]);

            // get [datatype] object = value format
            var listParsedLine = processedLine.split(parseRule);
            //listParsedLine = listParsedLine.split(/[=]/g)

            var keyValue = micropyUtils.checkString(listParsedLine);

            // insert into variables 
            for (var name in keyValue) {
                micropyUtils.storedVariables[name] = keyValue[name];
            }
        }

        /* generate lines of micropy variable declarations */
        var lines = [];
        for (var name in micropyUtils.storedVariables) {
            var variableName = name;
            if (typeof micropyUtils.storedVariables[name] !== "function" && typeof micropyUtils.storedVariables[name] !== "object") {
                var variableValue = micropyUtils.convertToString(micropyUtils.storedVariables[name]);
                lines.push("" + variableName + " = " + variableValue);

            }
        }

        // do add new lines to every line
        var linesChunk = ""
        for (var index in lines ) {
            var linePiece = lines[index];
            linesChunk = linesChunk + linePiece + "\n";
        }

        var programToWrite = linesChunk + program;
        writeProgram("micropython", programToWrite, slotid, function() {
            console.log("micropy program write complete")
        })
    }

    /**  write a micropy program into a slot of the SPIKE Prime
     * 
     * @ignore
     * @param {string} projectName name of the project to register
     * @param {string} data the micropy code to send (expecting an <input type="text">.value)
     * @param {integer} slotid slot number to assign the program in [0-9]
     * @param {function} callback callback to run after program is written
     */
    async function writeProgram(projectName, data, slotid, callback) {

        // reinit witeProgramTimeout
        if (writeProgramSetTimeout != undefined) {
            clearTimeout(writeProgramSetTimeout);
            writeProgramSetTimeout = undefined;
        }

        // template of python file that needs to be concatenated
        var firstPart = "from runtime import VirtualMachine\n\n# Stack for execution:\nasync def stack_1(vm, stack):\n"
        var secondPart = "# Setup for execution:\ndef setup(rpc, system, stop):\n\n    # Initialize VM:\n    vm = VirtualMachine(rpc, system, stop, \"Target__1\")\n\n    # Register stack on VM:\n    vm.register_on_start(\"stack_1\", stack_1)\n\n    return vm"

        // stringify data and strip trailing and leading quotation marks
        var stringifiedData = JSON.stringify(data);
        stringifiedData = stringifiedData.substring(1, stringifiedData.length - 1);

        var result = ""; // string to which the final code will be appended

        var splitData = stringifiedData.split(/\\n/); // split the code by every newline

        // add a tab before every newline (this is syntactically needed for concatenating with the template)
        for (var index in splitData) {

            var addedTab = "    " + splitData[index] + "\n";

            result = result + addedTab;
        }

        // replace tab characters
        result = result.replace(/\\t/g, "    ");

        stringifiedData = firstPart + result + secondPart;

        writeProgramCallback = callback;

        // begin the write program process
        UJSONRPC.startWriteProgram(projectName, "python", stringifiedData, slotid);

    }

    /**  Execute a program in a slot
     * 
     * @ignore
     * @param {integer} slotid slot of program to execute [0-9]
     */
    function executeProgram(slotid) {
        UJSONRPC.programExecute(slotid)
    }

    //////////////////////////////////////////
    //                                      //
    //         SPIKE APP Functions          //
    //                                      //
    //////////////////////////////////////////

    /** PrimeHub object
    * @ignore
    * @memberof Service_SPIKE
    * @returns {classes} 
    * <p> left_button </p>
    * <p> right_button </p>
    * <p> motion_sensor </p>
    * <p> light_matrix </p>
    */
    PrimeHub = function () {
        var newOrigin = 0;

        /** The left button on the hub
        * @class
        * @returns {functions} - functions from PrimeHub.left_button
        * @example
        * var hub = mySPIKE.PrimeHub();
        * var left_button = hub.left_button();
        * // do something with left_button
        */
        var left_button = {};

        /** execute callback after this button is pressed
        * @param {function} callback
        */
        left_button.wait_until_pressed = function wait_until_pressed(callback) {
            funcAfterLeftButtonPress = callback;
        }
        /** execute callback after this button is released
         *
         * @param {function} callback
         */
        left_button.wait_until_released = function wait_until_released(callback) {
            funcAfterLeftButtonRelease = callback;
        }
        /** Tests to see whether the button has been pressed since the last time this method called.
         *
         * @returns {boolean} - True if was pressed, false otherwise
         */
        left_button.was_pressed = function was_pressed() {
            if (hubLeftButton.duration > 0) {
                hubLeftButton.duration = 0;
                return true;
            } else {
                return false;
            }
        }

        /** Tests to see whether the button is pressed
        *
        * @returns {boolean} True if pressed, false otherwise
        */
        left_button.is_pressed = function is_pressed() {
            if (hubLeftButton.pressed) {
                return true;
            }
            else {
                return false;
            }
        }

        /** The right button on the hub
         * @class
         * @returns {functions} functions from PrimeHub.right_button
         * @example
         * var hub = mySPIKE.PrimeHub();
         * var right_button = hub.right_button();
         * // do something with right_button
         */
        var right_button = {};

        /** execute callback after this button is pressed
        *
        * @param {function} callback
        * @example
        * var hub = new mySPIKE.PrimeHub();
        * var right_button = hub.right_button;
        * right_button.wait_until_pressed ( function () {
        *     console.log("right_button was pressed");
        * })
        */
        right_button.wait_until_pressed = function wait_until_pressed(callback) {

            funcAfterRightButtonPress = callback;
        }

        /** execute callback after this button is released
         * 
         * @param {function} callback 
         * @example
         * var hub = new mySPIKE.PrimeHub();
         * var right_button = hub.right_button;
         * right_button.wait_until_released ( function () {
         *     console.log("right_button was released");
         * })
         */
        right_button.wait_until_released = function wait_until_released(callback) {

            functAfterRightButtonRelease = callback;
        }

        /** Tests to see whether the button has been pressed since the last time this method called.
         * 
         * @returns {boolean} - True if was pressed, false otherwise
         * @example
         * var hub = new mySPIKE.PrimeHub();
         * if ( hub.right_button.was_pressed() ) {
         *     console.log("right_button was pressed");
         * }
         */
        right_button.was_pressed = function was_pressed() {
            if (hubRightButton.duration > 0) {
                hubRightButton.duration = 0;
                return true;
            } else {
                return false;
            }
        }

        /** Tests to see whether the button is pressed
         * 
         * @returns {boolean} True if pressed, false otherwise
         */
        right_button.is_pressed = function is_pressed() {
            if (hubRightButton.pressed) {
                return true;
            }
            else {
                return false;
            }
        }

        /** Hub's light matrix
         * @class
         * @returns {functions} - functions from PrimeHub.light_matrix
         * @example
         * var hub = mySPIKE.PrimeHub();
         * var light_matrix = hub.light_matrix();
         * // do something with light_matrix
         */
        var light_matrix = {};

        /**
         * @todo Implement this function
         * @param {string}
         */
        light_matrix.show_image = function show_image(image) {

        }
        /** Sets the brightness of one pixel (one of the 25 LED) on the Light Matrix.
         * 
         * @param {integer} x [0 to 4]
         * @param {integer} y [0 to 4]
         * @param {integer} brightness [0 to 100]
         */
        light_matrix.set_pixel = function set_pixel(x, y, brightness = 100) {
            UJSONRPC.displaySetPixel(x, y, brightness);

        }
        /** Writes text on the Light Matrix, one letter at a time, scrolling from right to left.
         * 
         * @param {string} message 
         */
        light_matrix.write = function write(message) {
            UJSONRPC.displayText(message);
        }
        /** Turns off all the pixels on the Light Matrix.
         * 
         */
        light_matrix.off = function off() {
            UJSONRPC.displayClear();
        }

        /** Hub's speaker
         * @class
         * @returns {functions} functions from Primehub.speaker
         * @example
         * var hub = mySPIKE.PrimeHub();
         * var speaker = hub.speaker();
         * // do something with speaker
         */
        var speaker = {};

        speaker.volume = 100;

        /** Plays a beep on the Hub.
         * 
         * @param {integer} note The MIDI note number [44 to 123 (60 is middle C note)]
         * @param {number} seconds The duration of the beep in seconds
         */
        speaker.beep = function beep(note, seconds) {
            UJSONRPC.soundBeep(speaker.volume, note);
            setTimeout(function () { UJSONRPC.soundStop() }, seconds * 1000);
        }

        /** Starts playing a beep.
         * 
         * @param {integer} note The MIDI note number [44 to 123 (60 is middle C note)]
         */
        speaker.start_beep = function start_beep(note) {
            UJSONRPC.soundBeep(speaker.volume, note)
        }

        /** Stops any sound that is playing.
         * 
         */
        speaker.stop = function stop() {
            UJSONRPC.soundStop();
        }

        /** Retrieves the value of the speaker volume.
         * @returns {number} The current volume [0 to 100]
         */
        speaker.get_volume = function get_volume() {
            return speaker.volume;
        }

        /** Sets the speaker volume.
         * 
         * @param {integer} newVolume 
         */
        speaker.set_volume = function set_volume(newVolume) {
            speaker.volume = newVolume
        }

        /** Hub's motion sensor
         * @class
         * @returns {functions} functions from PrimeHub.motion_sensor
         * @example
         * var hub = mySPIKE.PrimeHub();
         * var motion_sensor = hub.motion_sensor();
         * // do something with motion_sensor
         */
        var motion_sensor = {};

        /** Sees whether a gesture has occurred since the last time was_gesture() 
         * was used or since the beginning of the program (for the first use).
         * 
         * @param  {string} gesture
         * @returns {boolean} true if the gesture was made, false otherwise
         */
        motion_sensor.was_gesture = function was_gesture(gesture) {

            var gestureWasMade = false;

            // iterate over the hubGestures array
            for (index in hubGestures) {

                // pick a gesture from the array
                var oneGesture = hubGestures[index];

                // switch the flag that gesture existed
                if (oneGesture == gesture) {
                    gestureWasMade = true;
                    break;
                }
            }
            // reinitialize hubGestures so it only holds gestures that occurred after this was_gesture() execution
            hubGestures = [];

            return gestureWasMade;

        }

        /** Executes callback when a new gesture happens
         * 
         * @param  {function(string)} callback - A callback whose signature is name of the gesture
         */
        motion_sensor.wait_for_new_gesture = function wait_for_new_gesture(callback) {

            funcAfterNewGesture = callback;

        }

        /** Executes callback when the orientation of the Hub changes or when function was first called
         * 
         * @param  {function(string)} callback - A callback whose signature is name of the orientation
         */
        motion_sensor.wait_for_new_orientation = function wait_for_new_orientation(callback) {
            // immediately return current orientation if the method was called for the first time
            if (waitForNewOriFirst) {
                waitForNewOriFirst = false;
                callback(lastHubOrientation);
            }
            // for future executions, wait until new orientation
            else {
                funcAfterNewOrientation = callback;
            }

        }

        /** “Yaw” is the rotation around the front-back (vertical) axis.
         * 
         * @returns {integer} yaw angle
         */
        motion_sensor.get_yaw_angle = function get_yaw_angle() {
            var currPos = hub.pos[0];

            return currPos;
        }

        /** “Pitch” the is rotation around the left-right (transverse) axis.
         * 
         * @returns {integer} pitch angle
         */
        motion_sensor.get_pitch_angle = function get_pitch_angle() {
            return hub.pos[1];
        }

        /** “Roll” the is rotation around the front-back (longitudinal) axis.
         * 
         * @returns {integer} roll angle
         */
        motion_sensor.get_roll_angle = function get_roll_angle() {
            return hub.pos[2];
        }

        /** Gets the acceleration of the SPIKE's yaw axis
         * 
         * @returns {integer} acceleration
         */
        motion_sensor.get_yaw_acceleration = function get_yaw_acceleration() {
            return hub.pos[2];
        }

        /**  Gets the acceleration of the SPIKE's pitch axis
         * 
         * @returns {integer} acceleration
         */
        motion_sensor.get_pitch_acceleration = function get_pitch_acceleration() {
            return hub.pos[1];
        }

        /** Gets the acceleration of the SPIKE's roll axis
         * 
         * @returns {integer} acceleration
         */
        motion_sensor.get_roll_acceleration = function get_roll_acceleration() {
            return hub.pos[0];
        }

        /** Retrieves the most recently detected gesture.
         * 
         * @returns {string} the name of gesture
         */
        motion_sensor.get_gesture = function get_gesture() {
            return hubGesture;
        }

        /** Retrieves the most recently detected orientation
         * Note: Hub does not detect orientation of when it was connected
         * 
         * @returns {string} the name of orientation
         */
        motion_sensor.get_orientation = function get_orientation() {
            return lastHubOrientation;
        }

        return {
            motion_sensor: motion_sensor,
            light_matrix: light_matrix,
            left_button: left_button,
            right_button: right_button,
            speaker: speaker
        }
    }

    /** Motor
     * @class
     * @param {string} Port
     * @memberof Service_SPIKE
     * @returns {functions}
     */
    Motor = function (port) {

        var motor = ports[port]; // get the motor info by port

        // default settings
        var defaultSpeed = 100;
        var stopMethod = false; // stop method doesnt seem to work in this current ujsonrpc config
        var stallSetting = true;

        // check if device is a motor
        if (motor.device != "smallMotor" && motor.device != "bigMotor") {
            throw new Error("No motor detected at port " + port);
        }

        /** Get current speed of the motor
         *  
         * @returns {number} speed of motor [-100 to 100]
         */
        function get_speed() {
            var motor = ports[port]; // get the motor info by port
            var motorInfo = motor.data;
            return motorInfo.speed;

        }

        /** Get current position of the motor
         * 
         * @returns {number} position of motor [0 to 359]
         */
        function get_position() {
            var motor = ports[port]; // get the motor info by port
            var motorInfo = motor.data;
            return motorInfo.angle;
        }

        /** Get current degrees counted of the motor
         * 
         * @returns {number} counted degrees of the motor [any number]
         */
        function get_degrees_counted() {
            var motor = ports[port]; // get the motor info by port
            var motorInfo = motor.data;
            return motorInfo.uAngle;
        }

        /** Get the power of the motor
         * 
         * @returns {number} motor power
         */
        function get_power() {
            var motor = ports[port]; // get the motor info by port
            var motorInfo = motor.data;
            return motorInfo.power;
        }

        /** Get the default speed of this motor
         * 
         * @returns {number} motor default speed [-100 to 100]
         */
        function get_default_speed() {
            return defaultSpeed;
        }

        /** Set the default speed for this motor
         * 
         * @param {number} speed [-100 to 100]
         */
        function set_default_speed(speed) {
            if (typeof speed == "number") {
                defaultSpeed = speed;
            }
        }

        /** Turns stall detection on or off.
         * Stall detection senses when a motor has been blocked and can’t move.
         * If stall detection has been enabled and a motor is blocked, the motor will be powered off
         * after two seconds and the current motor command will be interrupted. If stall detection has been
         * disabled, the motor will keep trying to run and programs will “get stuck” until the motor is no
         * longer blocked.
         * @param {boolean} boolean - true if to detect stall, false otherwise
         */
        function set_stall_detection(boolean) {
            if (typeof boolean == "boolean") {
                stallSetting = boolean;
            }
        }

        /** Runs the motor to an absolute position.
         * 
         * @param {integer} degrees [0 to 359]
         * @param {integer} speed [-100 to 100]
         * @param {function} [callback==undefined] Parameters:"stalled" or "done"
         */
        function run_to_position(degrees, speed, callback = undefined) {
            if (speed !== undefined && typeof speed == "number") {
                UJSONRPC.motorGoRelPos(port, degrees, speed, stallSetting, stopMethod, callback);
            }
            else {
                UJSONRPC.motorGoRelPos(port, degrees, defaultSpeed, stallSetting, stopMethod, callback);
            }
        }

        /** Start the motor at some power
         * 
         * @param {integer} power [-100 to 100]
         */
        function start_at_power(power) {
            UJSONRPC.motorPwm(port, power, stallSetting);
        }


        /** Start the motor at some speed
         * 
         * @param {integer} speed [-100 to 100]
         */
        function start(speed = defaultSpeed) {
            // if (speed !== undefined && typeof speed == "number") {
            // UJSONRPC.motorStart (port, speed, stallSetting);
            // }
            // else {
            // UJSONRPC.motorStart(port, defaultSpeed, stallSetting);
            // }

            UJSONRPC.motorStart(port, speed, stallSetting);
        }

        /** Run the motor for some seconds
         * 
         * @param {integer} seconds 
         * @param {integer} speed [-100 to 100]
         * @param {function} [callback==undefined] Parameters:"stalled" or "done"
         */
        function run_for_seconds(seconds, speed, callback = undefined) {
            if (speed !== undefined && typeof speed == "number") {
                UJSONRPC.motorRunTimed(port, seconds, speed, stallSetting, stopMethod, callback)
            }
            else {
                UJSONRPC.motorRunTimed(port, seconds, defaultSpeed, stallSetting, stopMethod, callback)
            }
        }

        /** Run the motor for some degrees
         * 
         * @param {integer} degrees 
         * @param {integer} speed [-100 to 100]
         * @param {function} [callback==undefined] Parameters:"stalled" or "done"
         */
        function run_for_degrees(degrees, speed, callback = undefined) {
            if (speed !== undefined && typeof speed == "number") {
                UJSONRPC.motorRunDegrees(port, degrees, speed, stallSetting, stopMethod, callback);
            }
            else {
                UJSONRPC.motorRunDegrees(port, degrees, defaultSpeed, stallSetting, stopMethod, callback);
            }
        }

        /** Stop the motor
         * 
         */
        function stop() {
            UJSONRPC.motorPwm(port, 0, stallSetting);
        }

        return {
            run_to_position: run_to_position,
            start_at_power: start_at_power,
            start: start,
            stop: stop,
            run_for_degrees: run_for_degrees,
            run_for_seconds: run_for_seconds,
            set_default_speed: set_default_speed,
            set_stall_detection: set_stall_detection,
            get_power: get_power,
            get_degrees_counted: get_degrees_counted,
            get_position: get_position,
            get_speed: get_speed,
            get_default_speed: get_default_speed
        }
    }

    /** ColorSensor
     * @class
     * @param {string} Port
     * @memberof Service_SPIKE
     * @returns {functions}
     */
    ColorSensor = function (port) {
        var waitForNewColorFirst = false;

        var colorsensor = ports[port]; // get the color sensor info by port
        var colorsensorData = colorsensor.data;

        // check if device is a color sensor
        if (colorsensor.device != "color") {
            throw new Error("No Color Sensor detected at port " + port);
        }

        /** Get the name of the detected color
         * @returns {string} 'black','violet','blue','cyan','green','yellow','red','white',None
         */
        function get_color() {
            var colorsensor = ports[port]; // get the color sensor info by port
            var colorsensorData = colorsensor.data;

            var color = colorsensorData.color;

            return color;
        }

        /** Retrieves the intensity of the ambient light.
         * @ignore
         * @returns {number} The ambient light intensity. [0 to 100]
         */
        function get_ambient_light() {
            var colorsensor = ports[port]; // get the color sensor info by port
            var colorsensorData = colorsensor.data;

            return colorsensorData.Cambient;
        }

        /** Retrieves the intensity of the reflected light.
         * 
         * @returns {number} The reflected light intensity. [0 to 100]
         */
        function get_reflected_light() {
            var colorsensor = ports[port]; // get the color sensor info by port
            var colorsensorData = colorsensor.data;

            return colorsensorData.Creflected;
        }

        /** Retrieves the red, green, blue, and overall color intensity.
         * @todo Implement overall intensity
         * @ignore
         * @returns {(number|Array)} Red, green, blue, and overall intensity (0-1024)
         */
        function get_rgb_intensity() {
            var colorsensor = ports[port]; // get the color sensor info by port
            var colorsensorData = colorsensor.data;

            var toReturn = [];
            toReturn.push(colorsensorData.Cr);
            toReturn.push(colorsensorData.Cg);
            toReturn.push(colorsensorData.Cb)
            toReturn.push("TODO: unimplemented");;
        }

        /** Retrieves the red color intensity.
         * 
        * @returns {number} [0 to 1024]
         */
        function get_red() {
            var colorsensor = ports[port]; // get the color sensor info by port
            var colorsensorData = colorsensor.data;

            return colorsensorData.RGB[0];
        }

        /** Retrieves the green color intensity.
         * 
         * @returns {number} [0 to 1024]
         */
        function get_green() {
            var colorsensor = ports[port]; // get the color sensor info by port
            var colorsensorData = colorsensor.data;

            return colorsensorData.RGB[1];
        }

        /** Retrieves the blue color intensity.
         * 
         * @returns {number} [0 to 1024]
         */
        function get_blue() {
            var colorsensor = ports[port]; // get the color sensor info by port
            var colorsensorData = colorsensor.data;

            return colorsensorData.RGB[2];
        }


        /** Waits until the Color Sensor detects the specified color.
         * @ignore
         * @todo Implement this function
         */
        function wait_until_color(color) {
            var color = get_color();
            console.log(color);
        }


        /** Execute callback when Color Sensor detects a new color.
         * The first time this method is called, it returns immediately the detected color. 
         * After that, it waits until the Color Sensor detects a color that is different from the color that
         * was detected the last time this method was used.
         * @ignore
         * @todo Implement this function
         * @param {function(string)} callback  
         */
        function wait_for_new_color(callback) {

            // check if this method has been executed after start of program
            if (waitForNewColorFirst) {
                waitForNewColorFirst = true;

                var currentColor = get_color();
                callback(currentColor)
            }
            funcAfterNewColor = callback;
        }

        return {
            get_color: get_color,
            get_ambient_light: get_ambient_light,
            get_reflected_light: get_reflected_light,
            get_rgb_intensity: get_rgb_intensity,
            get_red: get_red,
            get_green: get_green,
            get_blue: get_blue
        }

    }

    /** DistanceSensor
     * @class
     * @param {string} Port
     * @memberof Service_SPIKE
     * @returns {functions}
     */
    DistanceSensor = function (port) {

        var distanceSensor = ports[port] // get the distance sensor info by port
        var distanceSensorData = distanceSensor.data;

        // check if device is a distance sensor
        if (distanceSensor.device != "ultrasonic") {
            throw new Error("No Distance Sensor detected at port " + port);
        }

        /** Retrieves the measured distance in centimeters.
         * @param {boolean} short_range Whether to use or not the short range mode.
         * @returns {number} [0 to 200]
         * @todo find the short_range handling ujsonrpc script
         */
        function get_distance_cm(short_range) {
            var distanceSensor = ports[port] // get the distance sensor info by port
            var distanceSensorData = distanceSensor.data;

            return distanceSensorData.distance;
        }

        /** Retrieves the measured distance in inches.
         * 
         * @param {boolean} short_range Whether to use or not the short range mode.
         * @returns {number} [0 to 79]
         * @todo find the short_range handling ujsonrpc script
         */
        function get_distance_inches(short_range) {
            var distanceSensor = ports[port] // get the distance sensor info by port
            var distanceSensorData = distanceSensor.data;

            var inches = distanceSensorData.distance * 0.393701;
            return inches;
        }

        /** Retrieves the measured distance in percent.
         * 
         * @param {boolean} short_range Whether to use or not the short range mode.
         * @returns {number/string} [0 to 100] or 'none' if can't read distance
         * @todo find the short_range handling ujsonrpc script
         */
        function get_distance_percentage(short_range) {
            var distanceSensor = ports[port] // get the distance sensor info by port
            var distanceSensorData = distanceSensor.data;

            if (distanceSensorData.distance == null) {
                return "none"
            }
            var percentage = distanceSensorData.distance / 200;
            return percentage;
        }

        /** Waits until the measured distance is greater than distance.
         * 
         * @param {integer} distance 
         * @param {string} unit 'cm','in','%'
         * @param {integer} short_range 
         * @todo Implement this function
         */
        function wait_for_distance_farther_than(distance, unit, short_range) {

        }

        /** xWaits until the measured distance is less than distance.
         * 
         * @param {any} distance 
         * @param {any} unit 'cm','in','%'
         * @param {any} short_range 
         * @todo Implement this function
         */
        function wait_for_distance_closer_than(distance, unit, short_range) {

        }

        return {
            get_distance_cm: get_distance_cm,
            get_distance_inches: get_distance_inches,
            get_distance_percentage: get_distance_percentage
        }

    }

    /** ForceSensor
     * @class
     * @param {string} Port
     * @memberof Service_SPIKE
     * @returns {functions}
     */
    ForceSensor = function (port) {

        var sensor = ports[port]; // get the force sensor info by port

        if (sensor.device != "force") {
            throw new Error("No Force Sensor detected at port " + port);
        }

        /** Tests whether the button on the sensor is pressed.
         * 
         * @returns {boolean} true if force sensor is pressed, false otherwise
         */
        function is_pressed() {
            var sensor = ports[port]; // get the force sensor info by port
            var ForceSensorData = sensor.data;

            return ForceSensorData.pressed;
        }

        /** Retrieves the measured force, in newtons.
         * 
         * @returns {number}  Force in newtons [0 to 10]
         */
        function get_force_newton() {
            var sensor = ports[port]; // get the force sensor info by port
            var ForceSensorData = sensor.data;

            return ForceSensorData.force;
        }

        /** Retrieves the measured force as a percentage of the maximum force.
         * 
         * @returns {number} percentage [0 to 100]
         */
        function get_force_percentage() {
            var sensor = ports[port]; // get the force sensor info by port
            var ForceSensorData = sensor.data;

            var denominator = 704 - 384 // highest detected - lowest detected forceSensitive values
            var numerator = ForceSensorData.forceSensitive - 384 // 384 is the forceSensitive value when not pressed
            var percentage = Math.round((numerator / denominator) * 100);
            return percentage;
        }

        /** Executes callback when Force Sensor is pressed
         * The function is executed in updateHubPortsInfo()'s Force Sensor part
         * 
         * @param {function} callback 
         */
        function wait_until_pressed(callback) {
            funcAfterForceSensorPress = callback;
        }

        /** Executes callback when Force Sensor is released
         * The function is executed in updateHubPortsInfo()'s Force Sensor part
         * @param {function} callback 
         */
        function wait_until_released(callback) {
            funcAfterForceSensorRelease = callback;
        }

        return {
            is_pressed: is_pressed,
            get_force_newton: get_force_newton,
            get_force_percentage: get_force_percentage,
            wait_until_pressed: wait_until_pressed,
            wait_until_released: wait_until_released
        }

    }

    /** MotorPair
     * @class
     * @param {string} leftPort
     * @param {string} rightPort
     * @memberof Service_SPIKE
     * @returns {functions}
     * @todo implement the rest (what is differential (tank) steering? )
     */
    MotorPair = function (leftPort, rightPort) {
        // settings 
        var defaultSpeed = 100;

        var leftMotor = ports[leftPort];
        var rightMotor = ports[rightPort];

        var DistanceTravelToRevolutionRatio = 17.6;

        // check if device is a motor
        if (leftMotor.device != "smallMotor" && leftMotor.device != "bigMotor") {
            throw new Error("No motor detected at port " + port);
        }
        if (rightMotor.device != "smallMotor" && rightMotor.device != "bigMotor") {
            throw new Error("No motor detected at port " + port);
        }

        /** Sets the ratio of one motor rotation to the distance traveled.
         * 
         * If there are no gears used between the motors and the wheels of the Driving Base, 
         * then amount is the circumference of one wheel.
         * 
         * Calling this method does not affect the Driving Base if it is already currently running. 
         * It will only have an effect the next time one of the move or start methods is used.
         * 
         * @param {number} amount 
         * @param {string} unit 'cm','in'
         */
        function set_motor_rotation(amount, unit) {

            // assume unit is 'cm' when undefined
            if (unit == "cm" || unit !== undefined) {
                DistanceTravelToRevolutionRatio = amount;
            }
            else if (unit == "in") {
                // convert to cm
                DistanceTravelToRevolutionRatio = amount * 2.54;
            }
        }

        /** Starts moving the Driving Base
         * 
         * @param {integer} left_speed [-100 to 100]
         * @param {integer} right_speed [-100 to 100]
         */
        function start_tank(left_speed, right_speed) {
            UJSONRPC.moveTankSpeeds(left_speed, right_speed, leftPort, rightPort);
        }

        // /** Starts moving the Driving Base without speed control.
        //  * 
        //  * @param {any} power 
        //  * @param {any} steering 
        //  * @todo Implement this function
        //  */
        // function start_at_power (power, steering) {

        // }

        /** Starts moving the Driving Base
         * 
         * @param {integer} leftPower 
         * @param {integer} rightPower  
         */
        function start_tank_at_power(leftPower, rightPower) {
            UJSONRPC.moveTankPowers(leftPower, rightPower, leftPort, rightPort);
        }

        /** Stops the 2 motors simultaneously, which will stop a Driving Base.
         * 
         */
        function stop() {
            UJSONRPC.moveTankPowers(0, 0, leftPort, rightPort);
        }

        return {
            stop: stop,
            set_motor_rotation: set_motor_rotation,
            start_tank: start_tank,
            start_tank_at_power: start_tank_at_power
        }

    }

    //////////////////////////////////////////
    //                                      //
    //          UJSONRPC Functions          //
    //                                      //
    //////////////////////////////////////////

    /** Low Level UJSONRPC Commands
     * @ignore
     * @namespace UJSONRPC
     */
    var UJSONRPC = {};

    /**
     * 
     * @memberof! UJSONRPC
     * @param {string} text 
     */
    UJSONRPC.displayText = async function displayText(text) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' + ', "m": "scratch.display_text", "p": {"text":' + '"' + text + '"' + '} }'
        sendDATA(command);
    }

    /**
     * @memberof! UJSONRPC
     * @param {integer} x [0 to 4]
     * @param {integer} y [0 to 4]
     * @param {integer} brightness [1 to 100]
     */
    UJSONRPC.displaySetPixel = async function displaySetPixel(x, y, brightness) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' + ', "m": "scratch.display_set_pixel", "p": {"x":' + x +
            ', "y":' + y + ', "brightness":' + brightness + '} }';
        sendDATA(command);
    }

    /**
     * @memberof! UJSONRPC
     */
    UJSONRPC.displayClear = async function displayClear() {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' + ', "m": "scratch.display_clear" }';
        sendDATA(command);
    }

    /**
     * @memberof! UJSONRPC
     * @param {string} port 
     * @param {integer} speed 
     * @param {integer} stall 
     */
    UJSONRPC.motorStart = async function motorStart(port, speed, stall) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' + ', "m": "scratch.motor_start", "p": {"port":'
            + '"' + port + '"' +
            ', "speed":' + speed +
            ', "stall":' + stall +
            '} }';
        sendDATA(command);
    }

    /** moves motor to a position
     * 
     * @memberof! UJSONRPC
     * @param {string} port 
     * @param {integer} position 
     * @param {integer} speed 
     * @param {boolean} stall 
     * @param {boolean} stop 
     * @param {function} callback
     */
    UJSONRPC.motorGoRelPos = async function motorGoRelPos(port, position, speed, stall, stop, callback) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.motor_go_to_relative_position"' +
            ', "p": {' +
            '"port":' + '"' + port + '"' +
            ', "position":' + position +
            ', "speed":' + speed +
            ', "stall":' + stall +
            ', "stop":' + stop +
            '} }';
        if (callback != undefined) {
            pushResponseCallback(randomId, callback);
        }
        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {string} port 
     * @param {integer} time 
     * @param {integer} speed 
     * @param {integer} stall 
     * @param {boolean} stop
     * @param {function} callback
     */
    UJSONRPC.motorRunTimed = async function motorRunTimed(port, time, speed, stall, stop, callback) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.motor_run_timed"' +
            ', "p": {' +
            '"port":' + '"' + port + '"' +
            ', "time":' + time +
            ', "speed":' + speed +
            ', "stall":' + stall +
            ', "stop":' + stop +
            '} }';
        if (callback != undefined) {
            pushResponseCallback(randomId, callback);
        }
        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {string} port 
     * @param {integer} degrees 
     * @param {integer} speed 
     * @param {integer} stall 
     * @param {boolean} stop
     * @param {function} callback
     */
    UJSONRPC.motorRunDegrees = async function motorRunDegrees(port, degrees, speed, stall, stop, callback) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.motor_run_for_degrees"' +
            ', "p": {' +
            '"port":' + '"' + port + '"' +
            ', "degrees":' + degrees +
            ', "speed":' + speed +
            ', "stall":' + stall +
            ', "stop":' + stop +
            '} }';
        if ( callback != undefined ) {
            pushResponseCallback(randomId, callback);
        }
        sendDATA(command);
    }

    /**
     * @memberof! UJSONRPC
     * @param {integer} time 
     * @param {integer} lspeed 
     * @param {integer} rspeed 
     * @param {string} lmotor 
     * @param {string} rmotor 
     * @param {boolean} stop
     * @param {function} callback
     */
    UJSONRPC.moveTankTime = async function moveTankTime(time, lspeed, rspeed, lmotor, rmotor, stop, callback) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.move_tank_time"' +
            ', "p": {' +
            '"time":' + time +
            ', "lspeed":' + lspeed +
            ', "rspeed":' + rspeed +
            ', "lmotor":' + '"' + lmotor + '"' +
            ', "rmotor":' + '"' + rmotor + '"' +
            ', "stop":' + stop +
            '} }';
        if (callback != undefined) {
            pushResponseCallback(randomId, callback);
        }
        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {integer} degrees 
     * @param {integer} lspeed 
     * @param {integer} rspeed 
     * @param {string} lmotor 
     * @param {string} rmotor 
     * @param {boolean} stop
     * @param {function} callback
     */
    UJSONRPC.moveTankDegrees = async function moveTankDegrees(degrees, lspeed, rspeed, lmotor, rmotor, stop, callback) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.move_tank_degrees"' +
            ', "p": {' +
            '"degrees":' + degrees +
            ', "lspeed":' + lspeed +
            ', "rspeed":' + rspeed +
            ', "lmotor":' + '"' + lmotor + '"' +
            ', "rmotor":' + '"' + rmotor + '"' +
            ', "stop":' + stop +
            '} }';
        if (callback != undefined) {
            pushResponseCallback(randomId, callback);
        }
        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {integer} lspeed 
     * @param {integer} rspeed 
     * @param {string} lmotor 
     * @param {string} rmotor 
     * @param {function} callback
     */
    UJSONRPC.moveTankSpeeds = async function moveTankSpeeds(lspeed, rspeed, lmotor, rmotor, callback) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.move_start_speeds"' +
            ', "p": {' +
            '"lspeed":' + lspeed +
            ', "rspeed":' + rspeed +
            ', "lmotor":' + '"' + lmotor + '"' +
            ', "rmotor":' + '"' + rmotor + '"' +
            '} }';
        if (callback != undefined) {
            pushResponseCallback(randomId, callback);
        }
        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {integer} lpower 
     * @param {integer} rpower 
     * @param {string} lmotor 
     * @param {string} rmotor 
     * @param {function} callback
     */
    UJSONRPC.moveTankPowers = async function moveTankPowers(lpower, rpower, lmotor, rmotor, callback) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.move_start_powers"' +
            ', "p": {' +
            '"lpower":' + lpower +
            ', "rpower":' + rpower +
            ', "lmotor":' + '"' + lmotor + '"' +
            ', "rmotor":' + '"' + rmotor + '"' +
            '} }';
        if (callback != undefined) {
            pushResponseCallback(randomId, callback);
        }
        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {integer} volume 
     * @param {integer} note 
     */
    UJSONRPC.soundBeep = async function soundBeep(volume, note) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.sound_beep"' +
            ', "p": {' +
            '"volume":' + volume +
            ', "note":' + note +
            '} }';
        sendDATA(command);
    }

    /**
     * @memberof! UJSONRPC
     */
    UJSONRPC.soundStop = async function soundStop() {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "scratch.sound_off"' +
            '}';
        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {string} port 
     * @param {integer} power 
     * @param {integer} stall 
     */
    UJSONRPC.motorPwm = async function motorPwm(port, power, stall) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' + ', "m": "scratch.motor_pwm", "p": {"port":' + '"' + port + '"' +
            ', "power":' + power + ', "stall":' + stall + '} }';
        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {function} callback
     */
    UJSONRPC.getFirmwareInfo = async function getFirmwareInfo(callback) {
        var randomId = generateId();

        var command = '{"i":' + '"' + randomId + '"' + ', "m": "get_hub_info" ' + '}';
        sendDATA(command);
        if (callback != undefined) {
            getFirmwareInfoCallback = [randomId, callback];
        }
    }

    /**
     * @memberof! UJSONRPC
     * @param {function} callback 
     */
    UJSONRPC.triggerCurrentState = async function triggerCurrentState(callback) {
        var randomId = generateId();

        var command = '{"i":' + '"' + randomId + '"' + ', "m": "trigger_current_state" ' + '}';
        sendDATA(command);
        if (callback != undefined) {
            triggerCurrentStateCallback = callback;
        }
    }

    /** 
     * 
     * @memberof! UJSONRPC
     * @param {integer} slotid 
     */
    UJSONRPC.programExecute = async function programExecute(slotid) {
        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' + ', "m": "program_execute", "p": {"slotid":' + slotid + '} }';
        sendDATA(command);
    }

    /**
     * @memberof! UJSONRPC
     */
    UJSONRPC.programTerminate = function programTerminate() {

        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "program_terminate"' +
            '}';

        sendDATA(command);
    }

    /**
     * @memberof! UJSONRPC
     * @param {string} projectName name of the project
     * @param {integer} type type of data (micropy or scratch)
     * @param {string} data entire data to send in ASCII
     * @param {integer} slotid slot to which to assign the program
     */
    UJSONRPC.startWriteProgram = async function startWriteProgram(projectName, type, data, slotid) {

        console.log("%cTuftsCEEO ", "color: #3ba336;", "in startWriteProgram...");
        console.log("%cTuftsCEEO ", "color: #3ba336;", "constructing start_write_program script...");

        if (type == "python") {
            var typeInt = 0;
        }

        // construct the UJSONRPC packet to start writing program

        var dataSize = (new TextEncoder().encode(data)).length;

        var randomId = generateId();

        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "start_write_program", "p": {' +
            '"meta": {' +
            '"created": ' + parseInt(Date.now()) +
            ', "modified": ' + parseInt(Date.now()) +
            ', "name": ' + '"' + btoa(projectName) + '"' +
            ', "type": ' + typeInt +
            ', "project_id":' + Math.floor(Math.random() * 1000) +
            '}' +
            ', "fname": ' + '"' + projectName + '"' +
            ', "size": ' + dataSize +
            ', "slotid": ' + slotid +
            '} }';

        console.log("%cTuftsCEEO ", "color: #3ba336;", "constructed start_write_program script...");

        // assign function to start sending packets after confirming blocksize and transferid
        startWriteProgramCallback = [randomId, writePackageFunc];

        console.log("%cTuftsCEEO ", "color: #3ba336;", "sending start_write_program script");

        sendDATA(command);

        // check if start_write_program received a response after 5 seconds
        writeProgramSetTimeout = setTimeout(function () {
            if (startWriteProgramCallback != undefined) {
                if (funcAfterError != undefined) {
                    funcAfterError("5 seconds have passed without response... Please reboot the hub and try again.")
                }
            }
        }, 5000)

        // function to write the first packet of data
        function writePackageFunc(blocksize, transferid) {

            console.log("%cTuftsCEEO ", "color: #3ba336;", "in writePackageFunc...");

            console.log("%cTuftsCEEO ", "color: #3ba336;", "stringified the entire data to send: ", data);

            // when data's length is less than the blocksize limit of sending data
            if (data.length <= blocksize) {
                console.log("%cTuftsCEEO ", "color: #3ba336;", "data's length is less than the blocksize of ", blocksize);

                // if the data's length is not zero (not empty)
                if (data.length != 0) {

                    var dataToSend = data.substring(0, data.length); // get the entirety of data

                    console.log("%cTuftsCEEO ", "color: #3ba336;", "data's length is not zero, sending the entire data: ", dataToSend);

                    var base64data = btoa(dataToSend); // encode the packet to base64

                    UJSONRPC.writePackage(base64data, transferid); // send the packet

                    // writeProgram's callback defined by the user
                    if (writeProgramCallback != undefined) {
                        writeProgramCallback();
                    }

                }
                // the package to send is empty, so throw error
                else {
                    throw new Error("package to send is initially empty");
                }

            }
            // if the length of data to send is larger than the blocksize, send only a blocksize amount
            // and save the remaining data to send packet by packet
            else if (data.length > blocksize) {

                console.log("%cTuftsCEEO ", "color: #3ba336;", "data's length is more than the blocksize of ", blocksize);

                var dataToSend = data.substring(0, blocksize); // get the first block of packet

                console.log("%cTuftsCEEO ", "color: #3ba336;", "sending the blocksize amount of data: ", dataToSend);

                var base64data = btoa(dataToSend); // encode the packet to base64

                var msgID = UJSONRPC.writePackage(base64data, transferid); // send the packet

                var remainingData = data.substring(blocksize, data.length); // remove the portion just sent from data

                console.log("%cTuftsCEEO ", "color: #3ba336;", "reassigning writePackageInformation with message ID: ", msgID);
                console.log("%cTuftsCEEO ", "color: #3ba336;", "reassigning writePackageInformation with remainingData: ", remainingData);

                // update package information to be used for sending remaining packets
                writePackageInformation = [msgID, remainingData, transferid, blocksize];

            }

        }

    }



    /**
     * 
     * @memberof! UJSONRPC
     * @param {string} base64data base64 encoded data to send
     * @param {string} transferid transferid of this program write process
     * @returns {string} the randomly generated message id used to send this UJSONRPC script
     */
    UJSONRPC.writePackage = function writePackage(base64data, transferid) {

        var randomId = generateId();
        var writePackageCommand = '{"i":' + '"' + randomId + '"' +
            ', "m": "write_package", "p": {' +
            '"data": ' + '"' + base64data + '"' +
            ', "transferid": ' + '"' + transferid + '"' +
            '} }';

        sendDATA(writePackageCommand);

        return randomId;

    }

    /**
     * @memberof! UJSONRPC
     */
    UJSONRPC.getStorageStatus = function getStorageStatus() {

        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "get_storage_status"' +
            '}';

        sendDATA(command);

    }

    /**
     * @memberof! UJSONRPC
     * @param {string} slotid 
     */
    UJSONRPC.removeProject = function removeProject(slotid) {

        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "remove_project", "p": {' +
            '"slotid": ' + slotid +
            '} }';

        sendDATA(command);
    }

    /**
     * 
     * @memberof! UJSONRPC
     * @param {string} oldslotid 
     * @param {string} newslotid 
     */
    UJSONRPC.moveProject = function moveProject(oldslotid, newslotid) {

        var randomId = generateId();
        var command = '{"i":' + '"' + randomId + '"' +
            ', "m": "move_project", "p": {' +
            '"old_slotid": ' + oldslotid +
            ', "new_slotid: ' + newslotid +
            '} }';

        sendDATA(command);

    }


    //////////////////////////////////////////
    //                                      //
    //          Private Functions           //
    //                                      //
    //////////////////////////////////////////
    
    /**
    * @private
    * @param {function} callback 
    */
    async function triggerCurrentState(callback) {

        UJSONRPC.triggerCurrentState(callback);
    }

    /** 
     * 
     * @private
     * @param {string} id 
     * @param {string} funcName 
     */
    function pushResponseCallback(id, funcName) {

        var toPush = []; // [ ujson string id, function pointer ]

        toPush.push(id);
        toPush.push(funcName);

        // responseCallbacks has elements in it
        if (responseCallbacks.length > 0) {

            var emptyFound = false; // empty index was found flag

            // insert the pointer to the function where index is empty
            for (var index in responseCallbacks) {
                if (responseCallbacks[index] == undefined) {
                    responseCallbacks[index] = toPush;
                    emptyFound = true;
                }
            }

            // if all indices were full, push to the back
            if (!emptyFound) {
                responseCallbacks.push(toPush);
            }

        }
        // responseCallbacks current has no elements in it
        else {
            responseCallbacks.push(toPush);
        }

    }

    /**  Sleep function
     * @private
     * @param {number} ms Miliseconds to sleep
     * @returns {Promise} 
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**  generate random id for UJSONRPC messages
     * @private
     * @returns {string}
     */
    function generateId() {
        var generatedID = ""
        var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 4; i++) {
            var randomIndex = Math.floor(Math.random() * characters.length);
            generatedID = generatedID + characters[randomIndex];
        }

        return generatedID;
    }

    /**  Prompt user to select web serial port and make connection to SPIKE Prime
     * <p> Effect Makes prompt in Google Chrome ( Google Chrome Browser needs "Experimental Web Interface" enabled) </p>
     * <p> Note: </p>
     * <p> This function is to be executed before reading in JSON RPC streams from the hub </p>
     * <p> This function needs to be called when system is handling a user gesture (like button click) </p>
     * @private
     * @returns {boolean} True if web serial initialization is successful, false otherwise
     */
    async function initWebSerial() {
        try {
            var success = false;

            port = await navigator.serial.getPorts();
            console.log("%cTuftsCEEO ", "color: #3ba336;", "ports:", port);
            // select device
            port = await navigator.serial.requestPort({
                // filters:[filter]
            });
            // wait for the port to open.
            try {
                await port.open({ baudRate: 115200 });
            }
            catch (er) {
                console.log("%cTuftsCEEO ", "color: #3ba336;", er);
                // check if system requires baudRate syntax
                if (er.message.indexOf("baudrate") > -1) {
                    console.log("%cTuftsCEEO ", "color: #3ba336;", "baudRate needs to be baudrate");
                    await port.open({ baudrate: 115200 });
                }
                // check if error is due to unsuccessful closing of previous port
                else if (er.message.indexOf("close") > -1) {
                    if (funcAfterError != undefined) {
                        funcAfterError(er + "\nPlease try again. If error persists, refresh this environment.");
                    }
                    await port.close();
                } else {
                    if (funcAfterError != undefined) {
                        funcAfterError(er + "\nPlease try again. If error persists, refresh this environment.");
                    }
                }
                await port.close();
            }

            if (port.readable) {
                success = true;
            }
            else {
                success = false;
            }

            return success;


        } catch (e) {
            console.log("%cTuftsCEEO ", "color: #3ba336;", "Cannot read port:", e);
            if (funcAfterError != undefined) {
                funcAfterError(e);
            }
            return false;
        }
    }

    /**  Initialize writer object before sending commands
     * @private
     * 
     */
    function setupWriter() {
        // if writer not yet defined:
        if (typeof writer === 'undefined') {
            // set up writer for the first time
            const encoder = new TextEncoderStream();
            writableStreamClosed = encoder.readable.pipeTo(port.writable);
            writer = encoder.writable.getWriter();
        }
    }

    /** clean the json_string for concatenation into jsonline
     * @private
     * 
     * @param {any} json_string 
     * @returns {string}
     */
    function cleanJsonString(json_string) {
        var cleanedJsonString = "";
        json_string = json_string.trim();

        let findEscapedQuotes = /\\"/g;

        cleanedJsonString = json_string.replace(findEscapedQuotes, '"');
        cleanedJsonString = cleanedJsonString.substring(1, cleanedJsonString.length - 1);
        // cleanedJsonString = cleanedJsonString.replace(findNewLines,'');

        return cleanedJsonString;
    }

    /** Process the UJSON RPC script
     * 
     * @private
     * @param {any} lastUJSONRPC 
     * @param {string} [json_string="undefined"] 
     * @param {boolean} [testing=false] 
     * @param {any} callback 
     */
    async function processFullUJSONRPC(lastUJSONRPC, json_string = "undefined", testing = false, callback) {
        try {

            var parseTest = await JSON.parse(lastUJSONRPC)

            if (testing) {
                console.log("%cTuftsCEEO ", "color: #3ba336;", "processing FullUJSONRPC line: ", lastUJSONRPC);
            }

            // update hub information using lastUJSONRPC
            if (parseTest["m"] == 0) {
                updateHubPortsInfo();
            }
            PrimeHubEventHandler();

            if (funcWithStream) {
                await funcWithStream();
            }

        }
        catch (e) {
            // don't throw error when failure of processing UJSONRPC is due to micropython
            if (lastUJSONRPC.indexOf("Traceback") == -1 && lastUJSONRPC.indexOf(">>>") == -1 && json_string.indexOf("Traceback") == -1 && json_string.indexOf(">>>") == -1) {
                if (funcAfterError != undefined) {
                    funcAfterError("Fatal Error: Please close any other window or program that is connected to your SPIKE Prime");
                }
            }
            console.log(e);
            console.log("%cTuftsCEEO ", "color: #3ba336;", "error parsing lastUJSONRPC: ", lastUJSONRPC);
            console.log("%cTuftsCEEO ", "color: #3ba336;", "current jsonline: ", jsonline);
            console.log("%cTuftsCEEO ", "color: #3ba336;", "current cleaned json_string: ", cleanedJsonString)
            console.log("%cTuftsCEEO ", "color: #3ba336;", "current json_string: ", json_string);
            console.log("%cTuftsCEEO ", "color: #3ba336;", "current value: ", value);

            if (callback != undefined) {
                callback();
            }

        }
    }

    /**  Process a packet in UJSONRPC
    * @private
    *
    */
    async function parsePacket(value, testing = false, callback) {

        // console.log("%cTuftsCEEO ", "color: #3ba336;", value);

        // stringify the packet to look for carriage return
        var json_string = await JSON.stringify(value);

        var cleanedJsonString = cleanJsonString(json_string);
        // cleanedJsonString = cleanedJsonString.replace(findNewLines,'');

        jsonline = jsonline + cleanedJsonString; // concatenate packet to data
        jsonline = jsonline.trim();

        // regex search for carriage return
        let pattern = /\\r/g;
        var carriageReIndex = jsonline.search(pattern);

        // there is at least one carriage return in this packet
        if (carriageReIndex > -1) {

            // the concatenated packets start with a left curly brace (start of JSON)
            if (jsonline[0] == "{") {

                lastUJSONRPC = jsonline.substring(0, carriageReIndex);

                // look for conjoined JSON packets: there's at least two carriage returns in jsonline
                if (jsonline.match(/\\r/g).length > 1) {

                    var conjoinedPacketsArray = jsonline.split(/\\r/); // array that split jsonline by \r

                    // last index only contains "" as it would be after \r
                    for (var i = 0; i < conjoinedPacketsArray.length ; i++) {

                        // for every JSON object in array except last, perform data handling
                        if ( i < conjoinedPacketsArray.length -1 ) {
                            lastUJSONRPC = conjoinedPacketsArray[i];

                            processFullUJSONRPC(lastUJSONRPC, json_string, testing, callback);
                        }
                        else {
                            jsonline = conjoinedPacketsArray[i];
                        }
                    }
                }
                // there are no conjoined packets in this jsonline
                else {
                    lastUJSONRPC = jsonline.substring(0, carriageReIndex);

                    processFullUJSONRPC(lastUJSONRPC, json_string, testing, callback);

                    jsonline = jsonline.substring(carriageReIndex + 2, jsonline.length);
                }

            }
            else {
                console.log("%cTuftsCEEO ", "color: #3ba336;", "jsonline needs reset: ", jsonline);

                jsonline = jsonline.substring(carriageReIndex + 2, jsonline.length);

                console.log("%cTuftsCEEO ", "color: #3ba336;", "jsonline was reset to:" + jsonline);

                // reset jsonline for next concatenation
                // jsonline = "";
            }
        }

    }


    /**  Continuously take UJSON RPC input from SPIKE Prime
     * @private
     */
    async function streamUJSONRPC() {
        try {
            var firstReading = true;
            // read when port is set up
            while (port.readable) {

                // initialize readers
                const decoder = new TextDecoderStream();
                const readableStreamClosed = port.readable.pipeTo(decoder.writable);
                reader = decoder.readable.getReader();

                // continuously get
                while (true) {
                    try {

                        if (firstReading) {
                            console.log("%cTuftsCEEO ", "color: #3ba336;", "##### READING FIRST UJSONRPC LINE ##### CHECKING VARIABLES");
                            console.log("%cTuftsCEEO ", "color: #3ba336;", "jsonline: ", jsonline);
                            console.log("%cTuftsCEEO ", "color: #3ba336;", "lastUJSONRPC: ", lastUJSONRPC);
                            firstReading = false;
                        }
                        // read UJSON RPC stream ( actual data in {value} )
                        ({ value, done } = await reader.read());

                        // log value
                        if (micropython_interpreter) {
                            console.log("%cTuftsCEEO ", "color: #3ba336;", value);
                        }

                        // console.log("%cTuftsCEEO ", "color: #3ba336;", value);

                        //concatenate UJSONRPC packets into complete JSON objects
                        if (value) {
                            parsePacket(value);
                        }
                        if (done) {
                            serviceActive = false;
                            // reader has been canceled.
                            console.log("%cTuftsCEEO ", "color: #3ba336;", "[readLoop] DONE", done);
                        }
                    }
                    // error handler
                    catch (error) {
                        console.log("%cTuftsCEEO ", "color: #3ba336;", '[readLoop] ERROR', error);

                        serviceActive = false;

                        if (funcAfterDisconnect != undefined) {
                            funcAfterDisconnect();
                        }

                        if (funcAfterError != undefined) {
                            funcAfterError("SPIKE Prime hub has been disconnected");
                        }

                        writer.close();
                        //await writer.releaseLock();
                        await writableStreamClosed;

                        reader.cancel();
                        //await reader.releaseLock();
                        await readableStreamClosed.catch(reason => { });

                        await port.close();

                        writer = undefined;
                        reader = undefined;
                        jsonline = "";
                        lastUJSONRPC = undefined;
                        json_string = undefined;
                        cleanedJsonString = undefined;

                        break; // stop trying to read
                    }
                } // end of: while (true) [reader loop]

                // release the lock
                reader.releaseLock();

            } // end of: while (port.readable) [checking if readable loop]
            console.log("%cTuftsCEEO ", "color: #3ba336;", "- port.readable is FALSE")
        } // end of: trying to open port
        catch (e) {
            serviceActive = false;
            // Permission to access a device was denied implicitly or explicitly by the user.
            console.log("%cTuftsCEEO ", "color: #3ba336;", 'ERROR trying to open:', e);
        }
    }

    /** Get the devices that are connected to each port on the SPIKE Prime
     * <p> Effect: </p>
     * <p> Modifies {ports} global variable </p>
     * <p> Modifies {hub} global variable </p>
     * @private
     */
    async function updateHubPortsInfo() {

        // if a complete ujson rpc line was read
        if (lastUJSONRPC) {
            var data_stream; //UJSON RPC info to be parsed

            //get a line from the latest JSON RPC stream and parse to devices info
            try {
                data_stream = await JSON.parse(lastUJSONRPC);
                data_stream = data_stream.p;
            }
            catch (e) {
                console.log("%cTuftsCEEO ", "color: #3ba336;", "error parsing lastUJSONRPC at updateHubPortsInfo", lastUJSONRPC);
                console.log("%cTuftsCEEO ", "color: #3ba336;", typeof lastUJSONRPC);
                console.log("%cTuftsCEEO ", "color: #3ba336;", lastUJSONRPC.p);

                if (funcAfterError != undefined) {
                    funcAfterError("Fatal Error: Please reboot the Hub and refresh this environment");
                }

            }

            var index_to_port = ["A", "B", "C", "D", "E", "F"]

            // iterate through each port and assign a device_type to {ports}
            for (var key = 0; key < 6; key++) {

                let device_value = { "device": "none", "data": {} }; // value to go in ports associated with the port letter keys

                try {
                    var letter = index_to_port[key]

                    // get SMALL MOTOR information
                    if (data_stream[key][0] == 48) {

                        // parse motor information
                        var Mspeed = await data_stream[key][1][0];
                        var Mangle = await data_stream[key][1][1];
                        var Muangle = await data_stream[key][1][2];
                        var Mpower = await data_stream[key][1][3];

                        // populate value object
                        device_value.device = "smallMotor";
                        device_value.data = { "speed": Mspeed, "angle": Mangle, "uAngle": Muangle, "power": Mpower };
                        ports[letter] = device_value;
                    }
                    // get BIG MOTOR information
                    else if (data_stream[key][0] == 49) {
                        // parse motor information
                        var Mspeed = await data_stream[key][1][0];
                        var Mangle = await data_stream[key][1][1];
                        var Muangle = await data_stream[key][1][2];
                        var Mpower = await data_stream[key][1][3];

                        // populate value object
                        device_value.device = "bigMotor";
                        device_value.data = { "speed": Mspeed, "angle": Mangle, "uAngle": Muangle, "power": Mpower };
                        ports[letter] = device_value;

                    }
                    // get ULTRASONIC sensor information
                    else if (data_stream[key][0] == 62) {

                        // parse ultrasonic sensor information
                        var Udist = await data_stream[key][1][0];

                        // populate value object
                        device_value.device = "ultrasonic";
                        device_value.data = { "distance": Udist };
                        ports[letter] = device_value;
                    }
                    // get FORCE sensor information
                    else if (data_stream[key][0] == 63) {

                        // parse force sensor information
                        var Famount = await data_stream[key][1][0];
                        var Fbinary = await data_stream[key][1][1];
                        var Fbigamount = await data_stream[key][1][2];

                        // convert the binary output to boolean for "pressed" key
                        if (Fbinary == 1) {
                            var Fboolean = true;
                        } else {
                            var Fboolean = false;
                        }
                        // execute callback from ForceSensor.wait_until_pressed() 
                        if (Fboolean) {
                            // execute call back from wait_until_pressed() if it is defined
                            funcAfterForceSensorPress !== undefined && funcAfterForceSensorPress();

                            // destruct callback function
                            funcAfterForceSensorPress = undefined;

                            // indicate that the ForceSensor was pressed
                            ForceSensorWasPressed = true;
                        }
                        // execute callback from ForceSensor.wait_until_released()
                        else {
                            // check if the Force Sensor was just released
                            if (ForceSensorWasPressed) {
                                ForceSensorWasPressed = false;
                                funcAfterForceSensorRelease !== undefined && funcAfterForceSensorRelease();
                                funcAfterForceSensorRelease = undefined;
                            }
                        }

                        // populate value object
                        device_value.device = "force";
                        device_value.data = { "force": Famount, "pressed": Fboolean, "forceSensitive": Fbigamount }
                        ports[letter] = device_value;
                    }
                    // get COLOR sensor information
                    else if (data_stream[key][0] == 61) {

                        // parse color sensor information
                        var Creflected = await data_stream[key][1][0];
                        var CcolorID = await data_stream[key][1][1];
                        var Ccolor = colorDictionary[CcolorID];
                        var Cr = await data_stream[key][1][2];
                        var Cg = await data_stream[key][1][3];
                        var Cb = await data_stream[key][1][4];
                        var rgb_array = [Cr, Cg, Cb];

                        // populate value object
                        device_value.device = "color";
                        device_value.data = { "reflected": Creflected, "color": Ccolor, "RGB": rgb_array };
                        ports[letter] = device_value;
                    }
                    /// NOTHING is connected
                    else if (data_stream[key][0] == 0) {
                        // populate value object
                        device_value.device = "none";
                        device_value.data = {};
                        ports[letter] = device_value;
                    }

                    //parse hub information
                    var gyro_x = data_stream[6][0];
                    var gyro_y = data_stream[6][1];
                    var gyro_z = data_stream[6][2];
                    var gyro = [gyro_x, gyro_y, gyro_z];
                    hub["gyro"] = gyro;

                    var newOri = setHubOrientation(gyro);
                    // see if currently detected orientation is different from the last detected orientation
                    if (newOri !== lastHubOrientation) {
                        lastHubOrientation = newOri;

                        typeof funcAfterNewOrientation == "function" && funcAfterNewOrientation(newOri);
                        funcAfterNewOrientation = undefined;
                    }

                    var accel_x = data_stream[7][0];
                    var accel_y = data_stream[7][1];
                    var accel_z = data_stream[7][2];
                    var accel = [accel_x, accel_y, accel_z];
                    hub["accel"] = accel;

                    var posi_x = data_stream[8][0];
                    var posi_y = data_stream[8][1];
                    var posi_z = data_stream[8][2];
                    var pos = [posi_x, posi_y, posi_z];
                    hub["pos"] = pos;

                } catch (e) { } //ignore errors
            }
        }
    }

    /**  Catch hub events in UJSONRPC
     * <p> Effect: </p>
     * <p> Logs in the console when some particular messages are caught </p>
     * <p> Assigns the hub events global variables </p>
     * @private
     */
    async function PrimeHubEventHandler() {

        var parsedUJSON = await JSON.parse(lastUJSONRPC);

        var messageType = parsedUJSON["m"];

        //catch runtime_error made at ujsonrpc level
        if (messageType == "runtime_error") {
            var decodedResponse = atob(parsedUJSON["p"][3]);

            decodedResponse = JSON.stringify(decodedResponse);

            console.log("%cTuftsCEEO ", "color: #3ba336;", decodedResponse);

            var splitData = decodedResponse.split(/\\n/); // split the code by every newline

            // execute function after print if defined (only print the last line of error message)
            if (funcAfterError != undefined) {
                var errorType = splitData[splitData.length - 2];

                // error is a syntax error
                if (errorType.indexOf("SyntaxError") > -1) {
                    /* get the error line number*/
                    var lineNumberLine = splitData[splitData.length - 3];
                    console.log("%cTuftsCEEO ", "color: #3ba336;", "lineNumberLine: ", lineNumberLine);
                    var indexLine = lineNumberLine.indexOf("line");
                    var lineNumberSubstring = lineNumberLine.substring(indexLine, lineNumberLine.length);
                    var numberPattern = /\d+/g;
                    var lineNumber = lineNumberSubstring.match(numberPattern)[0];
                    console.log("%cTuftsCEEO ", "color: #3ba336;", lineNumberSubstring.match(numberPattern));
                    console.log("%cTuftsCEEO ", "color: #3ba336;", "lineNumber:", lineNumber);
                    console.log("%cTuftsCEEO ", "color: #3ba336;", "typeof lineNumber:", typeof lineNumber);
                    var lineNumberInNumber = parseInt(lineNumber) - 5;
                    console.log("%cTuftsCEEO ", "color: #3ba336;", "typeof lineNumberInNumber:", typeof lineNumberInNumber);

                    funcAfterError("line " + lineNumberInNumber + ": " + errorType);
                }
                else {
                    funcAfterError(errorType);
                }
            }
        }
        else if (messageType == 0) {

        }
        // storage information
        else if (messageType == 1) {

            var storageInfo = parsedUJSON["p"]["slots"]; // get info of all the slots

            for (var slotid in storageInfo) {
                hubProjects[slotid] = storageInfo[slotid]; // reassign hubProjects global variable
            }

        }
        // battery status
        else if (messageType == 2) {
            batteryAmount = parsedUJSON["p"][1];
        }
        // give center button click, left, right (?)
        else if (messageType == 3) {
            console.log("%cTuftsCEEO ", "color: #3ba336;", lastUJSONRPC);
            if (parsedUJSON.p[0] == "center") {
                hubMainButton.pressed = true;

                if (parsedUJSON.p[1] > 0) {
                    hubMainButton.pressed = false;
                    hubMainButton.duration = parsedUJSON.p[1];
                }
            }
            else if (parsedUJSON.p[0] == "connect") {
                hubBluetoothButton.pressed = true;

                if (parsedUJSON.p[1] > 0) {
                    hubBluetoothButton.pressed = false;
                    hubBluetoothButton.duration = parsedUJSON.p[1];
                }
            }
            else if (parsedUJSON.p[0] == "left") {
                hubLeftButton.pressed = true;

                // execute callback for wait_until_pressed() if defined
                typeof funcAfterLeftButtonPress === "function" && funcAfterLeftButtonPress();
                funcAfterLeftButtonPress = undefined;

                if (parsedUJSON.p[1] > 0) {
                    hubLeftButton.pressed = false;
                    hubLeftButton.duration = parsedUJSON.p[1];

                    // execute callback for wait_until_released() if defined
                    typeof funcAfterLeftButtonRelease === "function" && funcAfterLeftButtonRelease();
                    funcAfterLeftButtonRelease = undefined;
                }

            }
            else if (parsedUJSON.p[0] == "right") {
                hubRightButton.pressed = true;

                // execute callback for wait_until_pressed() if defined
                typeof funcAfterRightButtonPress === "function" && funcAfterRightButtonPress();
                funcAfterRightButtonPress = undefined;

                if (parsedUJSON.p[1] > 0) {
                    hubRightButton.pressed = false;
                    hubRightButton.duration = parsedUJSON.p[1];

                    // execute callback for wait_until_released() if defined
                    typeof funcAfterRightButtonRelease === "function" && funcAfterRightButtonRelease();
                    funcAfterRightButtonRelease = undefined;
                }
            }

        }
        // gives orientation of the hub (leftside, up,..), tapping of hub, 
        else if (messageType == 4) {
            /* this data stream is about hub orientation */

            var newOrientation = parsedUJSON.p;
            if (newOrientation == "1") {
                lastHubOrientation = "up";
            }
            else if (newOrientation == "4") {
                lastHubOrientation = "down";
            }
            else if (newOrientation == "0") {
                lastHubOrientation = "front";
            }
            else if (newOrientation == "3") {
                lastHubOrientation = "back";
            }
            else if (newOrientation == "2") {
                lastHubOrientation = "leftSide";
            }
            else if (newOrientation == "5") {
                lastHubOrientation = "rightSide";
            }

            console.log("%cTuftsCEEO ", "color: #3ba336;", lastUJSONRPC);
        }
        else if (messageType == 7) {
            if (funcAfterPrint != undefined) {
                funcAfterPrint(">>> Program started!");
            }
        }
        else if (messageType == 8) {
            if (funcAfterPrint != undefined) {
                funcAfterPrint(">>> Program finished!");
            }
        }
        else if (messageType == 9) {
            var encodedName = parsedUJSON["p"];
            var decodedName = atob(encodedName);
            hubName = decodedName;

            if (triggerCurrentStateCallback != undefined) {
                triggerCurrentStateCallback();
            }
        }
        else if (messageType == 11) {
            console.log("%cTuftsCEEO ", "color: #3ba336;", lastUJSONRPC);
        }
        else if (messageType == 14) {
            var newGesture = parsedUJSON.p;

            if (newGesture == "3") {
                hubGesture = "freefall";
                hubGestures.push(newGesture);
            }
            else if (newGesture == "2") {
                hubGesture = "shake";
                hubGestures.push("shaken"); // the string is different at higher level
            }
            else if (newGesture == "1") {
                hubFrontEvent = "tapped";
                hubGestures.push(newGesture);
            }
            else if (newGesture == "0") {
                hubFrontEvent = "doubletapped";
                hubGestures.push(newGesture);
            }

            // execute funcAfterNewGesture callback that was taken at wait_for_new_gesture()
            if (typeof funcAfterNewGesture === "function") {
                funcAfterNewGesture(newGesture);
                funcAfterNewGesture = undefined;
            }

            console.log("%cTuftsCEEO ", "color: #3ba336;", lastUJSONRPC);

        }
        else if (messageType == "userProgram.print") {
            var printedMessage = parsedUJSON["p"]["value"];
            var NLindex = printedMessage.search(/\\n/);
            printedMessage = await printedMessage.substring(0, NLindex);

            console.log("%cTuftsCEEO ", "color: #3ba336;", atob(printedMessage));

            // execute function after print if defined
            if (funcAfterPrint != undefined) {
                funcAfterPrint(atob(printedMessage));
            }
        }
        else {

            // general parameters check
            if (parsedUJSON["r"]) {
                if (parsedUJSON["r"]["slots"]) {

                    var storageInfo = parsedUJSON["r"]["slots"]; // get info of all the slots

                    for (var slotid in storageInfo) {
                        hubProjects[slotid] = storageInfo[slotid]; // reassign hubProjects global variable
                    }

                }
            }

            // getFirmwareInfo callback check
            if (getFirmwareInfoCallback != undefined) {
                if (getFirmwareInfoCallback[0] == parsedUJSON["i"]) {
                    var version = parsedUJSON["r"]["runtime"]["version"];
                    var stringVersion = ""
                    for (var index in version) {
                        if (index < version.length - 1) {
                            stringVersion = stringVersion + version[index] + ".";
                        }
                        else {
                            stringVersion = stringVersion + version[index];
                        }
                    }
                    console.log("%cTuftsCEEO ", "color: #3ba336;", "firmware version: ", stringVersion);
                    getFirmwareInfoCallback[1](stringVersion);
                }
            }

            console.log("%cTuftsCEEO ", "color: #3ba336;", "received response: ", lastUJSONRPC);

            // iterate over responseCallbacks global variable
            for (var index in responseCallbacks) {

                var currCallbackInfo = responseCallbacks[index];

                // check if the message id of UJSONRPC corresponds to that of a response callback
                if (currCallbackInfo[0] == parsedUJSON["i"]) {

                    var response = "null";

                    if (parsedUJSON["r"] == 0) {
                        response = "done";
                    }
                    else if (parsedUJSON["r"] == 2) {
                        response = "stalled";
                    }

                    // execute callback with the response
                    currCallbackInfo[1](response);

                    // empty the index of which callback that was just executed
                    responseCallbacks[index] = undefined;
                }
            }

            // execute the callback function after sending start_write_program UJSONRPC
            if (startWriteProgramCallback != undefined) {

                console.log("%cTuftsCEEO ", "color: #3ba336;", "startWriteProgramCallback is defined. Looking for matching mesasage id...")

                // check if the message id of UJSONRPC corresponds to that of a response callback
                if (startWriteProgramCallback[0] == parsedUJSON["i"]) {

                    console.log("%cTuftsCEEO ", "color: #3ba336;", "matching message id detected with startWriteProgramCallback[0]: ", startWriteProgramCallback[0])

                    // get the information for the packet sending
                    var blocksize = parsedUJSON["r"]["blocksize"]; // maximum size of each packet to be sent in bytes
                    var transferid = parsedUJSON["r"]["transferid"]; // id to use for transferring this program

                    console.log("%cTuftsCEEO ", "color: #3ba336;", "executing writePackageFunc expecting transferID of ", transferid);

                    // execute callback
                    await startWriteProgramCallback[1](blocksize, transferid);

                    console.log("%cTuftsCEEO ", "color: #3ba336;", "deallocating startWriteProgramCallback");

                    // deallocate callback
                    startWriteProgramCallback = undefined;
                }

            }

            // check if the program should write packages for a program
            if (writePackageInformation != undefined) {

                console.log("%cTuftsCEEO ", "color: #3ba336;", "writePackageInformation is defined. Looking for matching mesasage id...")

                // check if the message id of UJSONRPC corresponds to that of the first write_package script that was sent
                if (writePackageInformation[0] == parsedUJSON["i"]) {

                    console.log("%cTuftsCEEO ", "color: #3ba336;", "matching message id detected with writePackageInformation[0]: ", writePackageInformation[0]);

                    // get the information for the package sending process
                    var remainingData = writePackageInformation[1];
                    var transferID = writePackageInformation[2];
                    var blocksize = writePackageInformation[3];

                    // the size of the remaining data to send is less than or equal to blocksize
                    if (remainingData.length <= blocksize) {
                        console.log("%cTuftsCEEO ", "color: #3ba336;", "remaining data's length is less than or equal to blocksize");

                        // the size of remaining data is not zero
                        if (remainingData.length != 0) {

                            var dataToSend = remainingData.substring(0, remainingData.length);

                            console.log("%cTuftsCEEO ", "color: #3ba336;", "reminaing data's length is not zero, sending entire remaining data: ", dataToSend);

                            var base64data = btoa(dataToSend);

                            UJSONRPC.writePackage(base64data, transferID);

                            console.log("%cTuftsCEEO ", "color: #3ba336;", "deallocating writePackageInforamtion")

                            if (writeProgramCallback != undefined) {

                                writeProgramCallback();
                            }


                            writePackageInformation = undefined;
                        }
                    }
                    // the size of remaining data is more than the blocksize
                    else if (remainingData.length > blocksize) {

                        console.log("%cTuftsCEEO ", "color: #3ba336;", "remaining data's length is more than blocksize");

                        var dataToSend = remainingData.substring(0, blocksize);

                        console.log("%cTuftsCEEO ", "color: #3ba336;", "sending blocksize amount of data: ", dataToSend)

                        var base64data = btoa(dataToSend);

                        var messageid = UJSONRPC.writePackage(base64data, transferID);

                        console.log("%cTuftsCEEO ", "color: #3ba336;", "expected response with message id of ", messageid);

                        var remainingData = remainingData.substring(blocksize, remainingData.length);

                        writePackageInformation = [messageid, remainingData, transferID, blocksize];
                    }
                }

            }

        }
    }

    /** Get the orientation of the hub based on gyroscope values
     * 
     * @private
     * @param {(number|Array)} gyro 
     */
    function setHubOrientation(gyro) {
        var newOrientation;
        if (gyro[0] < 500 && gyro[0] > -500) {
            if (gyro[1] < 500 && gyro[1] > -500) {

                if (gyro[2] > 500) {
                    newOrientation = "front";
                }
                else if (gyro[2] < -500) {
                    newOrientation = "back";
                }
            }
            else if (gyro[1] > 500) {
                newOrientation = "up";
            }
            else if (gyro[1] < -500) {
                newOrientation = "down";
            }
        } else if (gyro[0] > 500) {
            newOrientation = "leftSide";
        }
        else if (gyro[0] < -500) {
            newOrientation = "rightSide";
        }

        return newOrientation;
    }

    // public members
    return {
        init: init,
        sendDATA: sendDATA,
        rebootHub: rebootHub,
        reachMicroPy: reachMicroPy,
        executeAfterInit: executeAfterInit,
        executeAfterPrint: executeAfterPrint,
        executeAfterError: executeAfterError,
        executeAfterDisconnect: executeAfterDisconnect,
        executeWithStream: executeWithStream,
        getPortsInfo: getPortsInfo,
        getPortInfo: getPortInfo,
        getBatteryStatus: getBatteryStatus,
        getFirmwareInfo: getFirmwareInfo,
        getHubInfo: getHubInfo,
        getHubName: getHubName,
        getProjects: getProjects,
        isActive: isActive,
        getBigMotorPorts: getBigMotorPorts,
        getSmallMotorPorts: getSmallMotorPorts,
        getUltrasonicPorts: getUltrasonicPorts,
        getColorPorts: getColorPorts,
        getForcePorts: getForcePorts,
        getMotorPorts: getMotorPorts,
        getMotors: getMotors,
        getDistanceSensors: getDistanceSensors,
        getColorSensors: getColorSensors,
        getForceSensors: getForceSensors,
        getLatestUJSON: getLatestUJSON,
        getBluetoothButton: getBluetoothButton,
        getMainButton: getMainButton,
        getLeftButton: getLeftButton,
        getRightButton: getRightButton,
        getHubGesture: getHubGesture,
        getHubEvent: getHubEvent,
        getHubOrientation: getHubOrientation,
        Motor: Motor,
        PrimeHub: PrimeHub,
        ForceSensor: ForceSensor,
        DistanceSensor: DistanceSensor,
        ColorSensor: ColorSensor,
        MotorPair: MotorPair,
        writeProgram: writeProgram,
        stopCurrentProgram: stopCurrentProgram,
        executeProgram: executeProgram,
        micropython: micropython // for final projects
    };
}



/*
Project Name: SPIKE Prime Web Interface
File name: micropyUtils.js
Author: Jeremy Jung
Last update: 10/22/20
Description: utility class to convert javascript variables to python variablse 
            for EN1 Simple Robotics final projects
Credits/inspirations:
History:
    Created by Jeremy on 10/18/20
(C) Tufts Center for Engineering Education and Outreach (CEEO)
NOTE:
strings need to be in single quotes
*/

var micropyUtils = {};

micropyUtils.storedVariables = {}; // all variables declared in window
micropyUtils.beginVariables = {}; // all variables declared in window before code

// automatically initialize microPyUtils to exclude predeclared variables when window loads
// this initializes after global variable declarations but before hoisted functions in <script> are executed
window.onload = function () {
    console.log("onload")
    //micropyUtils.init();
}

// this initializes after global variable declarations but before hoisted functions in <script> are executed
// this runs earlier than onload
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMCONtent")
    //micropyUtils.init();
})
//////////////////////////////////////////
//                                      //
//           Public Functions           //
//                                      //
//////////////////////////////////////////

// remember global variables declared BEFORE user code
micropyUtils.remember = function () {
    for (var name in window) {
        micropyUtils.beginVariables[name] = window[name];
    }
    console.log("remembered predeclared variables ", micropyUtils.beginVariables)
}

/* parse and add all local variable declarations to micropyUtils.storedVariables

var aString = "hi" or var aString = 'hi' > {aString: "hi"}


*/
// micropyUtils.addLocalVariables = function() {
//     // get the function definition of caller
//     var thisFunction = arguments.callee.caller.toString();

//     console.log(thisFunction);

//     // split function scope by newlines
//     var newLineRule = /\n/g
//     var arrayLines = thisFunction.split(newLineRule);

//     // filter lines that dont contain var, or contains function
//     var arrayVarLines = [];
//     for ( var index in arrayLines ) {
//         if ( arrayLines[index].indexOf("var") > -1 ) {
//             // filter out functions and objects
//             if (arrayLines[index].indexOf("function") == -1 && arrayLines[index].indexOf("{") == -1 && arrayLines[index].indexOf("}") == -1) {
//                 arrayVarLines.push(arrayLines[index]);
//             }
//         }
//     }

//     var parseRule = /[[ ]/g
//     for ( var index in arrayVarLines ) {
//         // process line
//         var processedLine = micropyUtils.processString(arrayVarLines[index]);

//         // get [datatype] object = value format
//         var listParsedLine = processedLine.split(parseRule);
//         //listParsedLine = listParsedLine.split(/[=]/g)

//         var keyValue = micropyUtils.checkString(listParsedLine);

//         // insert into variables 
//         for ( var name in keyValue ) {
//             micropyUtils.storedVariables[name] = keyValue[name];
//         }
//     }

// }

// initialize utility object (find window variables to exclude from conversion)
micropyUtils.init = function () {
    var excludeVariables = {};

    // get variables to exclude
    for (var compare in micropyUtils.beginVariables) {
        // if variables found on remember() are defined, these are not user-generated variables, so flag them predeclared
        if (typeof micropyUtils.beginVariables[compare] !== "undefined") {
            excludeVariables[compare] = "predeclared"
        }
    }

    // append window variables to micropyUtils.storedVariables, but exclude those predeclared
    for (var name in window) {
        if (excludeVariables[name] != "predeclared") {
            micropyUtils.storedVariables[name] = window[name];
        }
    }
    console.log("stored Variabls in init: ", micropyUtils.storedVariables);
}

micropyUtils.makeMicroPyDeclarations = function () {
    // initialize microPyUtils
    micropyUtils.init();

    /* add local variables of the caller of this function */
    // get the function definition of caller
    /* parse and add all local variable declarations to micropyUtils.storedVariables

    var aString = "hi" or var aString = 'hi' > {aString: "hi"}


    */
    var thisFunction = arguments.callee.caller.toString();

    console.log(thisFunction);

    // split function scope by newlines
    var newLineRule = /\n/g
    var arrayLines = thisFunction.split(newLineRule);

    // filter lines that dont contain var, or contains function
    var arrayVarLines = [];
    for (var index in arrayLines) {
        if (arrayLines[index].indexOf("var") > -1) {
            // filter out functions and objects
            if (arrayLines[index].indexOf("function") == -1 && arrayLines[index].indexOf("{") == -1 && arrayLines[index].indexOf("}") == -1) {
                arrayVarLines.push(arrayLines[index]);
            }
        }
    }

    var parseRule = /[[ ]/g
    for (var index in arrayVarLines) {
        // process line
        var processedLine = micropyUtils.processString(arrayVarLines[index]);

        // get [datatype] object = value format
        var listParsedLine = processedLine.split(parseRule);
        //listParsedLine = listParsedLine.split(/[=]/g)

        var keyValue = micropyUtils.checkString(listParsedLine);

        // insert into variables 
        for (var name in keyValue) {
            micropyUtils.storedVariables[name] = keyValue[name];
        }
    }

    /* generate lines of micropy variable declarations */
    var lines = [];
    for (var name in micropyUtils.storedVariables) {
        var variableName = name;
        if (typeof micropyUtils.storedVariables[name] !== "function" && typeof micropyUtils.storedVariables[name] !== "object") {
            var variableValue = micropyUtils.convertToString(micropyUtils.storedVariables[name]);
            lines.push("" + variableName + " = " + variableValue);

        }
    }

    return lines
}

//////////////////////////////////////////
//                                      //
//          Private Functions           //
//                                      //
//////////////////////////////////////////

// add local variables in which scope the utility tool is being used
micropyUtils.addVariables = function (object) {
    for (var name in object) {
        micropyUtils.storedVariables[name] = object[name];
    }
}


// filter out unparsable variable declarations and process valid ones
micropyUtils.processString = function (input) {
    var result = input.trim();
    var removeRule = /[;]/g
    result = result.replace(removeRule, "");
    var doubleQuotes = /[",']/g
    result = result.replace(doubleQuotes, "");
    return result;
}

// return key value pair of variable declaration
micropyUtils.checkString = function (list) {
    var result = {}; // {variable name: variable value}
    // check if list starts with var
    if (list[0] == "var") {
        var variableName = list[1];
        // check assignment operator
        if (list[2] == "=") {
            // assume the right hand side of assignment operator is only one term
            var value = list[3];

            result[variableName] = micropyUtils.convertFromString(value);

            return result;
        }
        else {
            return undefined;
        }
    }
    else {
        return undefined;
    }
}

// convert string value to correct data type value
micropyUtils.convertFromString = function (value) {
    // value is not a number
    if (isNaN(parseInt(value))) {
        // value is a bool
        if (value.indexOf("true") > -1) {
            return true;
        }
        else if (value.indexOf("false") > -1) {
            return false;
        }
        // value is a string
        else {
            return value;
        }
    }
    else {
        // value is a number
        var number = Number(value);
        return number;
    }
}

// convert datatype value to string value
micropyUtils.convertToString = function (value) {
    // value is a string, enclose with single quots and return
    if (typeof value == "string") {
        return "'" + value + "'";
    }
    else {
        // value is a number
        if (Number(value)) {
            return "" + value;
        }
        // value is boolean
        else {
            if (value) {
                return "True";
            }
            else {
                return "False";
            }
        }
    }
}

//////////////////////////////////////////
//                                      //
//                  Main                //
//                                      //
//////////////////////////////////////////

// remember predeclared variables when this file is loaded
micropyUtils.remember();