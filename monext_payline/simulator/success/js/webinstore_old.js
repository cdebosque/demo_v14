
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
	
    if (currentUrl.includes("http://127.0.0.1")) {
		rcUrl = "https://nepsa1.nepting.com/rc/ws?wsdl";
	} else {
		var endIndex = currentUrl.indexOf(contextPath);
		rcUrl = currentUrl.substring(0, endIndex) + "/rc/ws?wsdl";
	}
	varUrlError = urlError;
		
	soapEnvCNTR = 
	'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.nepting.com/nepweb/schemas">' +
	'<soapenv:Header>' +
    '<sch:AuthenticationRequestHeader login="?" password="?"/>' +
    '</soapenv:Header>' +
    '<soapenv:Body>' +
    '<sch:CreateNewTransactionRequest>' +
    '<sch:newTransaction merchantId="' +
    merchantId +
    '" posNumber="' +
    posNumber +
    '" merchantTransactionId="' +
    merchantTransactionId +
    '" amount="' +
    amount +
    '" currencyCode="' +
    currencyCode +
    '" urlSuccess="' +
    urlSuccess.encodeHTML() +
    '" urlError="' +
    urlError.encodeHTML() +
    '" urlRefused="' +
    urlRefused.encodeHTML() +
    '" urlStatus="' +
    urlStatus.encodeHTML() +
    '" sign="' +
    sign +
    '"/>' +
    '</sch:CreateNewTransactionRequest>' +
    '</soapenv:Body>' +
    '</soapenv:Envelope>';
	
	soapEnvGETR = 
		'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.nepting.com/nepweb/schemas">' +
		   '<soapenv:Header>' +
		      '<sch:AuthenticationRequestHeader login="?" password="?"/>' +
		   '</soapenv:Header>' +
		   '<soapenv:Body>' +
		      '<sch:GetEndedTransactionRequest merchantId="' +
		      merchantId +
		      '" posNumber="' +
		      posNumber +
		      '" merchantTransactionId="' +
		      merchantTransactionId +
		      '"/>' +
		   '</soapenv:Body>' +
		'</soapenv:Envelope>';
	
	soapEnvSATR = 
		'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.nepting.com/nepweb/schemas">' +
		   '<soapenv:Header>' +
		      '<sch:AuthenticationRequestHeader login="?" password="?"/>' +
		   '</soapenv:Header>' +
		   '<soapenv:Body>' +
		      '<sch:SetAbortedTransactionRequest merchantId="' +
		      merchantId +
		      '" posNumber="' +
		      posNumber +
		      '" merchantTransactionId="' +
		      merchantTransactionId +
		      '"/>' +
		   '</soapenv:Body>' +
		'</soapenv:Envelope>';

	soapEnvSNTR = 
		'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.nepting.com/nepweb/schemas">' +
		   '<soapenv:Header>' +
		      '<sch:AuthenticationRequestHeader login="?" password="?"/>' +
		   '</soapenv:Header>' +
		   '<soapenv:Body>' +
		      '<sch:SetNotifiedTransactionRequest merchantId="' +
		      merchantId +
		      '" posNumber="' +
		      posNumber +
		      '" merchantTransactionId="' +
		      merchantTransactionId +
		      '"/>' +
		   '</soapenv:Body>' +
		'</soapenv:Envelope>';

		$.ajax({ 
			url: rcUrl, 
			type: "POST",
			data: soapEnvCNTR,
			success: onCreate,
			error: onError,
			dataType: "xml", 
			contentType: "text/xml; charset=\"utf-8\"",
			timeout: 30000 
		});
};

function poll() {
	pollingEndTime = pollingStartTime + 300000; // poll for 5 minutes max
	if (Date.now() < pollingEndTime) {
		setTimeout(function () {
			$.ajax({ 
				url: rcUrl, 
				type: "POST",
				data: soapEnvGETR,
				success: onGet,
				error: onError,
				dataType: "xml", 
				contentType: "text/xml; charset=\"utf-8\"",
				complete: poll, 
				timeout: 30000 
			});
		}, 2000);
	}
	else {
		setAbortedTransaction();
	}
}

function onGet(response) {
	var endedTransaction = response.getElementsByTagName("GetEndedTransactionResponse")[0].getElementsByTagName("transactionResult")[0];
	
	if (endedTransaction != null) {
		setNotifiedTransaction(endedTransaction);
	} else {
		// Continue polling
	}
	
};

function onCreate(response) {
	var result = response.getElementsByTagName("CreateNewTransactionResponse")[0].getAttribute("result");
	if (result) {
		pollingStartTime = Date.now();
		poll();
	} else {
		alert("Erreur pendant l'envoi de la transaction.");
	}
};

function endTransaction(endedTransaction) {
	var result = endedTransaction.getAttribute("result");
	var extendedResult = endedTransaction.getAttribute("extendedResult");
	var merchantReference = endedTransaction.getAttribute("merchantReference");
	var systemDateTime = endedTransaction.getAttribute("systemDateTime");
	var amount = endedTransaction.getAttribute("amount");
	var currencyCode = endedTransaction.getAttribute("currencyCode");
	var paymentScheme = endedTransaction.getAttribute("paymentScheme");
	var ticket = endedTransaction.getAttribute("ticket");
	var sign = endedTransaction.getAttribute("sign");
	var urlSuccess = endedTransaction.getAttribute("urlSuccess").decodeHTML();
	var urlError = endedTransaction.getAttribute("urlError").decodeHTML();
	var urlRefused = endedTransaction.getAttribute("urlRefused").decodeHTML();
	var params = { 
			'nep_Result': result,
			'nep_ExtendedResult': extendedResult,
			'nep_MerchantReference': merchantReference,
			'nep_SystemDateTime': systemDateTime,
			'nep_Amount': amount,
			'nep_CurrencyCode': currencyCode,
			'nep-PaymentScheme': paymentScheme,
			'nep_Ticket': ticket,
			'nep_UrlSuccess': urlSuccess,
			'nep_UrlError': urlError,
			'nep_UrlRefused': urlRefused,
			'nep_Sign': sign
	}
	if (result === "U3VjY2Vzcw==") {  // base64 equivalent to "Success"
		post(urlSuccess, params, "post");
	} else if (result === "UmVmdXNlZA==") { // base64 equivalent to "Refused"
		post(urlRefused, params, "post");
	} else {
		post(urlError, params, "post");
	}
	
};

function onError() {
	var emptyParam;
	post(varUrlError, emptyParam, "post");
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

function setAbortedTransaction() {
	$.ajax({ 
		url: rcUrl, 
		type: "POST",
		data: soapEnvSATR,
		success: onAbort,
		error: onError,
		dataType: "xml", 
		contentType: "text/xml; charset=\"utf-8\"",
		timeout: 30000 
	});
}

function setNotifiedTransaction(endedTransaction) {
	$.ajax({ 
		url: rcUrl, 
		type: "POST",
		data: soapEnvSNTR,
		dataType: "xml", 
		complete: function(data) { endTransaction(endedTransaction); },
		contentType: "text/xml; charset=\"utf-8\"",
		timeout: 30000 
	});
}

function onAbort(response) {
	var emptyParam;
	post(varUrlError, emptyParam, "post");
}
