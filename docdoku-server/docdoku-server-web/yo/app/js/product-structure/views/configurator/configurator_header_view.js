/*global define,App*/
define(
    [
        'backbone',
        'mustache',
        'text!templates/configurator/configurator_header.html',
        'common-objects/views/udf/user_defined_function'
    ], function (Backbone, Mustache, template, UserDefinedFunctionView) {

        'use strict';

        var ConfiguratorHeaderView = Backbone.View.extend({

            events: {
                'click .attributes-modal': 'openAttributesModal'
            },

            initialize: function() {
                this.constructor.__super__.initialize.apply(this,arguments);
                this.attributes = [];
                this.subViews = [];
            },
            render: function() {
                this.$el.html(Mustache.render(template, {i18n: App.config.i18n}));
                return this;
            },

            openAttributesModal: function() {
                var modal = new UserDefinedFunctionView({configurator: true, collection: this.baselineTemp.calculations});
                modal.render().fetchAttributes();
                document.body.appendChild(modal.el);
                modal.openModal();
            },

            remove: function() {
                // remove all subViews and then call for the remove
                _.invoke(this.subViews, 'remove');
                Backbone.View.prototype.remove.call(this);
            }
        });

        return ConfiguratorHeaderView;
    });