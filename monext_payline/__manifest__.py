{
    'name': 'Monext Payline Payment Services',
    'version': '0.1',
    'category': 'Point of Sale',
    'sequence': 6,
    'summary': 'Credit card support for Payline CrossCanal (POS & Web)',
    'description': "",
    'depends': ['web', 'barcodes', 'point_of_sale'],
    'website': '',
    'data': [
        'security/ir.model.access.csv',
        'views/pos_payline_views.xml',
        'views/pos_payline_assets.xml',
        'views/pos_payline_templates.xml',
        'views/web_payline_views.xml',
    ],
    'qweb': [
        'static/src/xml/pos_payline.xml',
    ],
    'installable': True,
    'auto_install': False,
}
