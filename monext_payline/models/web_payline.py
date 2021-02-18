import requests
import json
import urllib.parse

from odoo import models, fields, api

class WebPaylineConfiguration(models.Model):
    _name = 'monext_payline.web_configuration'

    name = fields.Char(required=True, help='Name of this Payline configuration')
    endpoint_base_url = fields.Char(string='Url', required=True, help='Base Url of the endpoint for refund, must end with a slash')
    backend_type = fields.Selection([('m1', 'Magento 1'), ('m2', 'Magento 2')], required=True, default='m2')
    access_token = fields.Char(required=True, help='Access Token')

class WebPaylinePayment(models.Model):
    _name = 'monext_payline.web_payment'

    @api.model
    def do_refund(self, invoice_number, payment_values):
        configuration_lines = self.env['monext_payline.web_configuration'].search([])
        configuration = configuration_lines[0]

        if (configuration is None) :
            raise Exception('Invalid Payline Web Configuration')

        searchCriteria = 'searchCriteria[filterGroups][0][filters][0][field]=increment_id&searchCriteria[filterGroups][0][filters][0][value]='+invoice_number
        url = configuration.endpoint_base_url+"rest/all/V1/invoices" + "?" + urllib.parse.quote(searchCriteria, '/=&')
        headers = {'Accept': 'application/json', 'Authorization': 'Bearer '+configuration.access_token}
        response = requests.get(url, headers=headers)
        if (response.status_code != 200) :
            raise Exception('Impossible to call rest/all/V1/invoices, status code : '+str(response.status_code))

        invoices_data = json.loads(response.content.decode('utf-8'))
        if (invoices_data['total_count'] == 0):
            raise Exception('Impossible to get Magento invoice with increment id : '+invoice_number)

        invoice_id = invoices_data['items'][0]['entity_id']

        #print(urllib.parse.quote_plus(searchCriteria))

        data = {'isOnline': True}
        headers = {'Content-type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Bearer '+configuration.access_token}
        url = configuration.endpoint_base_url+"rest/all/V1/invoice/"+invoice_id+"/refund"
        response = requests.post(url, data=json.dumps(data), headers=headers)
        if (response.status_code != 200) :
            raise Exception('Impossible to call rest/all/V1/invoice/'+invoice_id+'/refund : '+str(response.status_code))

        return response

class AccountPayment(models.Model):
    _inherit = 'account.payment'

    @api.model
    def create(self, vals):
        current_invoice = self.env['account.invoice'].browse(self._context.get('active_id',False))

        if (current_invoice.type == 'out_refund'):
            self.env['monext_payline.web_payment'].do_refund(current_invoice.number, vals)

        return super(AccountPayment, self).create(vals)
