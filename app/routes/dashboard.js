import Ember from 'ember';
import ENV from '../config/environment';

export default Ember.Route.extend({
    
    setupController: function(controller, model) {
        this._super(controller, model);
        this.addObserver('controller.q', function() {
            this.refresh();
        });
        this.addObserver('controller.gte', function() {
            this.refresh();
        });
        this.addObserver('controller.lte', function() {
            this.refresh();
        });
    },
    
    // Note that the above query is NOT perfect. But we'll go with it for now.
    model: function() {
        let query = this.controllerFor('dashboard').get('q');
        let gte = this.controllerFor('dashboard').get('gte');
        let lte = this.controllerFor('dashboard').get('lte');
        return Ember.$.ajax({
            url: ENV.apiUrl +  '/search/abstractcreativework/_search',
            crossDomain: true,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                query: {
                    bool: {
                        must: [
                            {
                                query_string: {
                                    query: query
                                }
                            },
                            {
                                range: {
                                    date: {
                                        gte: gte,
                                        lte: lte,
                                        format: "yyyy-MM-dd||yyyy"
                                    }
                                }
                            }
                        ]
                    }
                }, 
                from: 0, 
                    aggregations: { 
                        sources: { 
                            terms: { 
                                field: 'sources.raw', 
                                size: 200 
                            } 
                        },
                        contributors : {
                            terms : {
                                field: 'contributors.raw',
                                size: 200
                            }
                        },
                        articles_over_time: {
                            date_histogram: {
                                field: 'date',
                                interval: 'month',
                                format:'yyyy-MM-dd'
                            },
                            aggregations: {
                                arttype: {
                                    terms: {
                                        field: 'type'
                                    }
                                }
                            }
                        }
                    },
                })
        }).then((json) => {
            let aggregations = json.aggregations;
            console.log(aggregations);
            let docs = json.hits.hits.map((hit) => {
                let source = Ember.Object.create(hit._source);
                let r = source.getProperties('type', 'title', 'description', 'language', 'date', 'date_created', 'date_modified', 'date_updated', 'date_published', 'tags', 'sources');
                r.id = hit._id;
                r.contributors = source.lists.contributors;
                r.funders = source.lists.funders;
                r.publishers = source.lists.publishers;
                r.institutions = source.lists.institutions;
                r.organizations = source.lists.organizations;
                return r;
            });
            return {aggregations: aggregations, docs: docs}; //allows us to access returned docs as model.docs, aggregations as model.aggregations
            
        });                                                                                            
                                                                                                      
    }
    
});
