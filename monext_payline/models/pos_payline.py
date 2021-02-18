import requests
import base64
import collections
import binascii

from hashlib import sha256
from odoo import models, fields, api

class PosPaylineConfiguration(models.Model):
    _name = 'monext_payline.pos_configuration'

    name = fields.Char(required=True, help='Name of this Payline configuration')
    merchant_id = fields.Char(string='Merchant ID', required=True, help='ID of the merchant to authenticate him on the payment provider server')
    mode = fields.Selection([('3', 'Simulator'), ('2', 'Test'), ('1', 'Production')], required=True, default='2', help='Mode (Simulator, Test or Production)')
    secret_key = fields.Char(required=True, help='Secret Key')

    def get_configuration_from_journal_id(self, journalId):
        journal_lines = self.env['account.journal'].search([('id', '=', journalId)])
        for journal in journal_lines:
            return journal.monext_payline_pos_configuration_id

        return null

    def get_endpoint_url(self):
        if (self.mode == '2') :
            return 'https://qualif.nepting.com/rc_wa/payment'
        elif  (self.mode == '1') :
            return 'https://nepsa1.nepting.com/webtpe/payment'
        else :
        #TODO Make it configurable
            return 'https://magento1-app.payline.determined.fr/simulator/success/index.html'

class PosPaylineTPE(models.Model):
    _name = 'monext_payline.pos_tpe'

    name = fields.Char(required=True, help='Name of the TPE')
    number = fields.Char(string='Number', required=True, help='Number of the TPE')

class AccountJournal(models.Model):
    _inherit = 'account.journal'

    monext_payline_pos_configuration_id = fields.Many2one('monext_payline.pos_configuration', string='Payline POS Credentials', help='The configuration of Payline POS used for this journal')

class PosPaylinePayment(models.Model):
    _name = 'monext_payline.pos_payment'

    def _sign_request_params(self, data, merchantKey):
        sign = []
        for key in data:
            if (key != 'nep_TransactionType'):
                sign.append(str(data[key]))

        sign.append(merchantKey)
        hash_sign = sha256('|'.join(sign).encode('utf-8'))
        return binascii.a2b_hex(hash_sign.hexdigest())

    def _sign_response_params(self, data, merchantKey):
        sign = []
        sign.append(data['nep_Result'])
        sign.append(data['nep_MerchantReference'])
        sign.append(merchantKey)
        hash_sign = sha256('|'.join(sign).encode('utf-8'))
        return binascii.a2b_hex(hash_sign.hexdigest())

    def get_payment_request_data(self, paymentData):
        data = collections.OrderedDict()
        data['nep_MerchantID'] = base64.b64encode(paymentData['merchant_id'].encode('utf-8')).decode('utf-8')
        data['nep_PosNumber'] = base64.b64encode(paymentData['tpe'].encode('utf-8')).decode('utf-8')
        data['nep_TransactionType'] = base64.b64encode(paymentData['type'].encode('utf-8')).decode('utf-8')
        data['nep_MerchantReference'] = base64.b64encode(paymentData['order_id'].encode('utf-8')).decode('utf-8')
        data['nep_Amount'] = int(paymentData['amount'] * 100)
        data['nep_CurrencyCode'] = 978
        data['nep_UrlSuccess'] = base64.b64encode(paymentData['url_success'].encode('utf-8')).decode('utf-8')
        data['nep_UrlError'] = base64.b64encode(paymentData['url_error'].encode('utf-8')).decode('utf-8')
        data['nep_UrlRefused'] = base64.b64encode(paymentData['url_refused'].encode('utf-8')).decode('utf-8')
        data['nep_UrlStatus'] = base64.b64encode(paymentData['url_status'].encode('utf-8')).decode('utf-8')
        data['nep_Mode'] = 2
        data['nep_Sign'] = base64.b64encode(self._sign_request_params(data, paymentData['secret_key'])).decode('utf-8')
        #print (data, data['nep_Sign'], paymentData['order_id'])
        #endpoint_url = 'https://qualif.nepting.com/rc_wa/payment'
        return data
