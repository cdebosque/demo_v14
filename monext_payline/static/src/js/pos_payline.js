odoo.define('pos_payline.pos_payline', function (require) {

var core    = require('web.core');
var rpc    = require('web.rpc');
//var screens = require('point_of_sale.screens');
var screens = require('point_of_sale.PaymentScreen');
var gui     = require('point_of_sale.Gui');
var pos_model = require('point_of_sale.models');
//var gui     = require('point_of_sale.gui');
//var pos_model = require('point_of_sale.models');

var _t      = core._t;

//var PopupWidget = require('point_of_sale.popups');
var PopupWidget = require('point_of_sale.PopupControllerMixin');
var PaymentScreenWidget = screens.PaymentScreenWidget;

pos_model.load_fields("account.journal", "monext_payline_pos_configuration_id");

PaymentScreenWidget.include({

    init: function(parent, options) {
        this._super(parent, options);
        this._remove_pending_paymentlines();

    },

    _remove_pending_paymentlines : function() {
        // TODO
        var lines = this.pos.get_order().get_paymentlines();
        for ( var i = 0; i < lines.length; i++ ) {
            if (lines[i].get_amount() == 0 && lines[i].cashregister.journal.monext_payline_pos_configuration_id) {
                this.pos.get_order().remove_paymentline(lines[i]);
                this.reset_input();
                this.render_paymentlines();
            }
        }
    },

    click_paymentmethods: function(id) {
        this._super(id);

        var order = this.pos.get_order();
        if (order.selected_paymentline.cashregister.journal.monext_payline_pos_configuration_id) {
            var def = new $.Deferred();
            if (order.get_due(order.selected_paymentline) > 0) {
                this.do_debit_immediat(order, def);
            } else if (order.get_due(order.selected_paymentline) < 0) {
                this.do_refund(order, def);
            }
        }
    },

    do_debit_immediat: function(order, def) {
        order.selected_paymentline.set_amount(0);
        order.selected_paymentline.payline_swipe_pending = true;
        this.render_paymentlines();
        order.trigger('change', order);
        
        var data = {
            amount: order.get_due(order.selected_paymentline),
            order_id: order.uid,
            journal_id: order.selected_paymentline.cashregister.journal.id,
            type: 'debitImmediat',
        }
        this.gui.show_popup('monext-payline-pos-payment-transaction', {
            transaction: def,
            choose_tpe_url: '/pos_payline/choose_tpe?data='+btoa(JSON.stringify(data))
        });
        def.then(function(data) {
            if (data.result == 'success') {
                order.selected_paymentline.set_amount(order.get_due(order.selected_paymentline));
                order.selected_paymentline.payline_swipe_pending = false;
                this.render_paymentlines();
                order.trigger('change', order);
            } else {
                this._remove_pending_paymentlines();
            }
        }.bind(this));
    },

    do_reversal: function(payment_line, order, def) {
        var data = {
            amount: payment_line.get_amount(),
            order_id: order.uid,
            journal_id: order.selected_paymentline.cashregister.journal.id,
            type: 'reversal',
        }
        this.gui.show_popup('monext-payline-pos-payment-transaction', {
            transaction: def,
            choose_tpe_url: '/pos_payline/choose_tpe?data='+btoa(JSON.stringify(data))
        });
    },

    do_refund: function(order, def) {
        order.selected_paymentline.set_amount(0);
        order.selected_paymentline.payline_swipe_pending = true;
        this.render_paymentlines();
        order.trigger('change', order);
        
        var data = {
            amount: Math.abs(order.get_due(order.selected_paymentline)),
            order_id: order.uid,
            journal_id: order.selected_paymentline.cashregister.journal.id,
            type: 'refund',
        }
        this.gui.show_popup('monext-payline-pos-payment-transaction', {
            transaction: def,
            choose_tpe_url: '/pos_payline/choose_tpe?data='+btoa(JSON.stringify(data))
        });
        def.then(function(data) {
            if (data.result == 'success') {
                order.selected_paymentline.set_amount(order.get_due(order.selected_paymentline));
                order.selected_paymentline.payline_swipe_pending = false;
                this.render_paymentlines();
                order.trigger('change', order);
            } else {
                this._remove_pending_paymentlines();
            }
        }.bind(this));
    },

    click_delete_paymentline: function(cid){
        var lines = this.pos.get_order().get_paymentlines();
        var _super = this._super.bind(this, cid);
        
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].cid === cid && lines[i].cashregister.journal.monext_payline_pos_configuration_id && lines[i].get_amount() != 0) {
                var def = new $.Deferred();
                this.do_reversal(lines[i], this.pos.get_order(), def);
                def.then(function(data) {
                    if (data.result == 'success') {
                        _super();
                    } else {
                        // TODO
                    }
                })
                return;
            }
        }

        this._super(cid);
    },

    validate_order: function(force_validation) {
        if (this.pos.get_order().is_paid() && ! this.invoicing) {
            var lines = this.pos.get_order().get_paymentlines();

            for (var i = 0; i < lines.length; i++) {
                if (lines[i].payline_swipe_pending) {
                    this.pos.get_order().remove_paymentline(lines[i]);
                    this.render_paymentlines();
                }
            }
        }

        this._super(force_validation);
    }

});

var PosPaylineTransactionPopupWidget = PopupWidget.extend({
    template: 'PosPaylineTransactionPopupWidget',
    show: function (options) {
        this._super(options);
        this.options.transaction.then(function(data) {
            this.gui.close_popup();
        }.bind(this))
        window.addEventListener("message", this.onMessage.bind(this), false)
        $('.pos .modal-dialog .popup.pos-payline').css('width', '750px').css('height', '550px')
    },
    onMessage: function(event) {
        if (event.data == 'success') {
            this.options.transaction.resolve({
                'result': 'success'
            })
        } else {
            this.options.transaction.resolve({
                'result': 'error'
            })
        }
    }
});

gui.define_popup({name:'monext-payline-pos-payment-transaction', widget: PosPaylineTransactionPopupWidget});

})
