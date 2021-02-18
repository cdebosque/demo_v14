
// Handle Left and Main Div Height
var divResize = function () {
	var mainDivHeight = parseInt($(".mainStandardDiv").css("height"), 10);
	var leftDivHeight = parseInt($(".leftStandardDiv").css("height"), 10);

	if ((mainDivHeight - 24) != leftDivHeight) {
		$(".leftStandardDiv").css("height", mainDivHeight - 24);
	}
}
divResize();

//window.onload = poll;
var soapEnvGETR;
var soapEnvCNTR;
var soapEnvSNTR;
var soapEnvSATR; 
var rcUrl;
var varUrlError;
var pollingStartTime;

if (!String.prototype.encodeHTML) {
  String.prototype.encodeHTML = function () {
    return this.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&apos;');
  };
}

if (!String.prototype.decodeHTML) {
  String.prototype.decodeHTML = function () {
    return this.replace(/&apos;/g, "'")
               .replace(/&quot;/g, '"')
               .replace(/&gt;/g, '>')
               .replace(/&lt;/g, '<')
               .replace(/&amp;/g, '&');
  };
}

function polling(merchantId, posNumber, merchantTransactionId, amount, currencyCode, urlSuccess, urlError, urlRefused, urlStatus, sign, currentUrl, contextPath){
	
    var result = 'U3VjY2Vzcw=='
	var params = { 
		'nep_Result': result,
		'nep_ExtendedResult': '',
		'nep_MerchantReference': merchantId,
		'nep_SystemDateTime': '',
		'nep_Amount': amount,
		'nep_CurrencyCode': currencyCode,
		'nep-PaymentScheme': '',
		'nep_Ticket': '',
		'nep_UrlSuccess': urlSuccess,
		'nep_UrlError': urlError,
		'nep_UrlRefused': urlRefused,
		'nep_Sign': sign
	}
	if (result === "U3VjY2Vzcw==") {  // base64 equivalent to "Success"
		setTimeout(function () {
			post(urlSuccess, params, "post");
		}, 5000);
	} else if (result === "UmVmdXNlZA==") { // base64 equivalent to "Refused"
		setTimeout(function () {
			post(urlRefused, params, "post");
		}, 5000);
	} else {
		setTimeout(function () {
			post(urlError, params, "post");
		}, 5000);
	}
	
};

function post(path, params, method) {
    method = method || "post"; // Set method to post by default if not specified.

    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for(var key in params) {
        if(params.hasOwnProperty(key)) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);

            form.appendChild(hiddenField);
         }
    }

    document.body.appendChild(form);
    form.submit();
}