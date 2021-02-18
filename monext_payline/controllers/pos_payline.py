import base64
import json

from odoo import http
from odoo.http import request

class PosPaylineController(http.Controller):

    @http.route('/pos_payline/choose_tpe', type='http', auth='user')
    def choose_tpe(self, data):
        paymentData = json.loads(base64.b64decode(data).decode('utf-8'))
        configuration = request.env['monext_payline.pos_configuration'].get_configuration_from_journal_id(paymentData['journal_id']).sudo()
        
        values = {
            'url': '/pos_payline/init_transaction?data='+data,
            'idxs': [],
            'tpe_numbers': [],
            'tpe_names': [],
            'tpe_selected': '',
            'is_simulation': True if configuration.mode == '3' else False
        }

        tpes = request.env['monext_payline.pos_payment'].env['monext_payline.pos_tpe'].search([])
        i = 0
        for tpe in tpes:
            values['idxs'].append(i)
            i = i + 1
            values['tpe_numbers'].append(tpe.number)
            values['tpe_names'].append(tpe.name)

        if 'pos_payline_tpe' in request.session:
            values['tpe_selected'] = request.session['pos_payline_tpe']

        return request.render('monext_payline.pos_payline_nepting_tpe_choice', values)

    @http.route('/pos_payline/init_transaction', type='http', auth='user')
    def init_transaction(self, data, **post):
        request.session['pos_payline_tpe'] = post['tpe']

        paymentData = json.loads(base64.b64decode(data).decode('utf-8'))
        paymentData.update(post)
        paymentData.update({
            'url_success': request.httprequest.url_root+'pos_payline/receive_transaction_success',
            'url_refused': request.httprequest.url_root+'pos_payline/receive_transaction_refused',
            'url_error': request.httprequest.url_root+'pos_payline/receive_transaction_error',
            'url_status': request.httprequest.url_root+'pos_payline/receive_transaction_status',
        })

        configuration = request.env['monext_payline.pos_configuration'].get_configuration_from_journal_id(paymentData['journal_id']).sudo()
        is_simulation = True if configuration.mode == '3' else False
        paymentData.update({'merchant_id': configuration.merchant_id, 'secret_key': configuration.secret_key})
        #print(paymentData, configuration.get_endpoint_url())
        params = request.env['monext_payline.pos_payment'].get_payment_request_data(paymentData)

        values = {
            'url': configuration.get_endpoint_url() if not is_simulation else post['endpoint_url'],
            'is_simulation': is_simulation,
            'idxs': [],
            'param_keys': [],
            'param_values': []
        }

        i = 0
        for k, v in params.items():
            values['idxs'].append(i)
            i = i + 1
            values['param_keys'].append(k)
            values['param_values'].append(v)

        #print(values)
        return request.render('monext_payline.pos_payline_nepting_init_transaction', values)

    @http.route('/pos_payline/receive_transaction_success', type='http', auth='user', csrf=False)
    def receive_transaction_success(self, **post):
        values = {
            'domain': request.httprequest.url_root
        }
        return request.render('monext_payline.pos_payline_nepting_receive_transaction_success', values)

    @http.route('/pos_payline/receive_transaction_refused', type='http', auth='user', csrf=False)
    def receive_transaction_refused(self, **post):
        values = {
            'domain': request.httprequest.url_root
        }
        return request.render('monext_payline.pos_payline_nepting_receive_transaction_failed', values)

    @http.route('/pos_payline/receive_transaction_error', type='http', auth='user', csrf=False)
    def receive_transaction_error(self, **post):
        values = {
            'domain': request.httprequest.url_root
        }
        return request.render('monext_payline.pos_payline_nepting_receive_transaction_failed', values)

    @http.route('/pos_payline/receive_transaction_status', type='http', auth='user', csrf=False)
    def receive_transaction_status(self, **post):
        #TODO
        return None
