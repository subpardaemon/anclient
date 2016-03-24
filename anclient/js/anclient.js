/**
 * spec at : https://docs.google.com/document/d/1Qw4u6ftavHCkzi5dxusGqDxuUzKxQRSgYhBVdTvT2Os
 * taxo at : https://docs.google.com/spreadsheets/d/15nWwAbzCokXck4EDgSx-t3jjl_GoXkDYzjfKFfPD5oE
 */

if (!Date.now) {
    Date.now = function() { return new parseInt((Date().getTime())/1000); }
}


/**
 * @namespace anclient
 */
var anclient = {
		serverreply: null,
		lang: 'en',
		/**
		 * @memberOf anclient
		 */
		taxonomy: {
			data: {},
			ready: false,
			context: null,
			hints: [],
			/**
			 * Converts the taxonomy JSON db to:
			 * - current language only
			 * - using hashes instead of arrays for props, qtys and terms
			 * - injecting pointers in terms to local props and qtys
			 * - creating prop mixins from top category to subcategories
			 * - a few other tricks
			 * @memberOf anclient.taxonomy
			 * @private
			 */
			convert_data: function() {
				var n,m,o,i,hp,lp,cg,re;
				re = {};
				n = ''; m = ''; o = ''; // stupid eclipse wdt
				for(n in anclient.taxonomy.data) {
					anclient.taxonomy.data[n].label = anclient.taxonomy.data[n].label[anclient.lang];
					hp = {};
					for(i=0;i<anclient.taxonomy.data[n].props.length;i++) {
						hp[anclient.taxonomy.data[n].props[i].key] = {
							key: anclient.taxonomy.data[n].props[i].key,
							legacy: anclient.taxonomy.data[n].props[i].legacy,
							labels: anclient.taxonomy.data[n].props[i].labels[anclient.lang]
						};
					}
					for(m in anclient.taxonomy.data[n].subcats) {
						lp = {};
						for(i=0;i<anclient.taxonomy.data[n].subcats[m].props.length;i++) {
							lp[anclient.taxonomy.data[n].subcats[m].props[i].key] = {
								key: anclient.taxonomy.data[n].subcats[m].props[i].key,
								legacy: anclient.taxonomy.data[n].subcats[m].props[i].legacy,
								labels: anclient.taxonomy.data[n].subcats[m].props[i].labels[anclient.lang]
							};
						}
						for(o in hp) {
							lp[hp[o].key] = hp[o];
						}
						anclient.taxonomy.data[n].subcats[m].props = lp;
						lp = {};
						for(i=0;i<anclient.taxonomy.data[n].subcats[m].qtys.length;i++) {
							lp[anclient.taxonomy.data[n].subcats[m].qtys[i].key] = {
								key: anclient.taxonomy.data[n].subcats[m].qtys[i].key,
								legacy: anclient.taxonomy.data[n].subcats[m].qtys[i].legacy,
								labels: anclient.taxonomy.data[n].subcats[m].qtys[i].labels[anclient.lang]
							};
						}
						anclient.taxonomy.data[n].subcats[m].qtys = lp;
						anclient.taxonomy.data[n].subcats[m].label = anclient.taxonomy.data[n].subcats[m].label[anclient.lang];
						lp = {};
						for(i=0;i<anclient.taxonomy.data[n].subcats[m].terms.length;i++) {
							cg = anclient.taxonomy.data[n].subcats[m].terms[i].code.split('/');
							lp[anclient.taxonomy.data[n].subcats[m].terms[i].key] = {
								key: anclient.taxonomy.data[n].subcats[m].terms[i].key,
								code: anclient.taxonomy.data[n].subcats[m].terms[i].code,
								legacy: anclient.taxonomy.data[n].subcats[m].terms[i].legacy,
								labels: anclient.taxonomy.data[n].subcats[m].terms[i].labels[anclient.lang],
								props: anclient.taxonomy.data[n].subcats[m].props,
								qtys: anclient.taxonomy.data[n].subcats[m].qtys,
								supercat: cg[0],
								cat: cg[1],
								subcat: cg[2],
								subcatlabel: anclient.taxonomy.data[n].subcats[m].label,
							catlabel: anclient.taxonomy.data[n].label
							};
							lp[anclient.taxonomy.data[n].subcats[m].terms[i].code] = lp[anclient.taxonomy.data[n].subcats[m].terms[i].key];
							re[anclient.taxonomy.data[n].subcats[m].terms[i].code] = lp[anclient.taxonomy.data[n].subcats[m].terms[i].key];
						}
						anclient.taxonomy.data[n].subcats[m].terms = lp;
					}
				}
				anclient.taxonomy.data['__resolver'] = re;
				anclient.taxonomy.ready = true;
			},
			/**
			 * @returns {Promise}
			 * @private
			 */
			load_data: function() {
				return new Promise(function(res,rej) {
					var lcd = localStorage.getItem('an-taxonomy');
					var lcv = localStorage.getItem('an-taxonomy-version');
					console.log('tax: taxonomy local data:',lcd,lcv);
					if ((lcd===null)||(parseInt(lcv)===null)||(parseInt(anclient.comm.apibase['taxonomy'])>parseInt(lcv))) { 
						console.log('tax: load taxonomy from server');
						anclient.comm.ajax_get('/api/taxonomy').then(function(d) {
							console.log('tax: loaded taxonomy from server');
							anclient.taxonomy.data = d;
							localStorage.setItem('an-taxonomy',JSON.stringify(d));
							localStorage.setItem('an-taxonomy-version',anclient.comm.apibase['taxonomy']);
							anclient.taxonomy.convert_data();
							anclient.taxonomy.create_hints(null);
							console.log('ext: loaded taxonomy db');
							res();
						},function(stat,err) {
							console.log('ext.err: '+stat+' '+err);
							rej();
						});
					} else {
						anclient.taxonomy.data = JSON.parse(lcd);
						anclient.taxonomy.convert_data();
						anclient.taxonomy.create_hints(null);
						res();
					}
				});
			},
			/**
			 * @returns {Object}
			 */
			get_item_by_path: function(term) {
				if (typeof anclient.taxonomy.data.__resolver[term]=='undefined') {
					return null;
				} else {
					return anclient.taxonomy.data.__resolver[term];
				}
			},
			create_hints: function(ctx) {
				anclient.taxonomy.context = ctx;
				anclient.taxonomy.hints = [];
				if (ctx===null) {
					for(var n in anclient.taxonomy.data['__resolver']) {
						var co = anclient.taxonomy.data['__resolver'][n];
						if (co.legacy=='no') {
							anclient.taxonomy.hints.push({
								match: latiniser.latinise(co.labels.primary),
								key: co.key,
								label_primary: co.labels.primary,
								label_secondary: co.catlabel+'/'+co.subcatlabel,
								ctxchange: co.code
							});
							if (co.labels.synonyms.length>0) {
								for(var i=0;i<co.labels.synonyms.length;i++) {
									anclient.taxonomy.hints.push({
										match: latiniser.latinise(co.labels.synonyms[i]),
										key: co.key,
										label_primary: co.labels.primary+' ['+co.labels.synonyms[i]+']',
										label_secondary: co.catlabel+'/'+co.subcatlabel,
										ctxchange: co.code
									});
								}
							}
						}
					}
				} else {
					var co = anclient.taxonomy.data['__resolver'][ctx];
					for(var n in co.props) {
						if (co.props[n].legacy=='no') {
							anclient.taxonomy.hints.push({
								match: latiniser.latinise(co.props[n].labels.primary),
								key: co.props[n].key,
								label_primary: co.props[n].labels.primary,
								label_secondary: null,
								ctxchange: null
							});
							if (co.props[n].labels.synonyms.length>0) {
								for(var i=0;i<co.props[n].labels.synonyms.length;i++) {
									anclient.taxonomy.hints.push({
										match: latiniser.latinise(co.props[n].labels.synonyms[i]),
										key: co.props[n].key,
										label_primary: co.props[n].labels.primary+' ['+co.props[n].labels.synonyms[i]+']',
										label_secondary: null,
										ctxchange: null
									});
								}
							}
						}
					}
				}
			},
			get_match: function(expr) {
				var matches = [];
				if (expr.length<1) return matches;
				if (anclient.taxonomy.hints.length===0) return matches;
				expr = latiniser.latinise(expr).toLowerCase();
				for(var i=0;i<anclient.taxonomy.hints.length;i++) {
					if (anclient.taxonomy.hints[i]['match'].indexOf(expr)>-1) {
						matches.push(anclient.taxonomy.hints[i]);
					}
				}
				matches.sort(function(a,b) {
					if (a['label_primary']>b['label_primary']) return 1;
					else if (a['label_primary']<b['label_primary']) return -1;
					return 0;
				});
				return matches;
			}
		},
		user: {
			defaultUser: 'user1@assist.network',
			defaultNode: '1',
			uid: '1',
			uname: 'testuser',
			sessionid: null,
			udata: {},
			lastpeek: null,
			/**
			 * @returns {Promise}
			 * @memberOf anclient.user
			 */
			login: function(user,node) {
				if (typeof node=='undefined') {
					node = anclient.user.defaultNode;
				}
				if (typeof user=='undefined') {
					user = anclient.user.defaultUser;
				}
				return new Promise(function(res,rej) {
					var params = {email:user,node:node,pos:anclient.geo.current};
					anclient.comm.ajax_get('/api/login', params).then(function(d) {
						if (typeof d.success=='undefined') {
							console.log('login.err: malformed packet');
							rej();
						} else {
							if (d.success===true) {
								anclient.user.uid = d.uid;
								anclient.user.uname = d.name;
								anclient.user.sessionid = d.auth_token;
								$('#an-username').text(anclient.user.uname+'@Node'+anclient.user.defaultNode);
								if (typeof d.syncdata!='undefined') {
									if (d.syncdata!==null) {
										var indata = JSON.parse(d.syncdata);
										localStorage.setItem('an-localid-'+anclient.user.defaultNode,indata['lastid']);
										localStorage.setItem('an-localinventory-'+anclient.user.defaultNode,indata['inventory']);
									} else {
										anclient.user.syncup();
									}
								}
								anclient.inventory.init();
								//anclient.user.poll();
								res();
							} else {
								console.log('login.err: login failed');
								rej();
							}
						}
					},function() {
						console.log('login.err: login packet fault');
						rej();
					});
				});
			},
			poll: function() {
				anclient.comm.ajax_get('/api/notification', {'lastts':anclient.user.lastpeek}).then(function(d) {
					console.log('poll: ',d);
					anclient.user.lastpeek = Date.now(); 
					setTimeout(anclient.user.poll,20000);
				},function() {
					setTimeout(anclient.user.poll,20000);
				});
			},
			/**
			 * Check if the user is logged in.
			 * @returns {Boolean}
			 */
			is_logged_in: function() {
				if (anclient.user.uid===null) return false;
				return true;
			},
			/**
			 * Return a unique local id for transactions etc, or null if the user is not logged in.
			 * @returns {Number}
			 */
			get_local_unique_id: function() {
				if (anclient.user.is_logged_in()===false) return null;
				var slid = localStorage.getItem('an-localid-'+anclient.user.defaultNode);
				if (slid===null) {
					slid = 1;
				} else {
					++slid;
				}
				localStorage.setItem('an-localid-'+anclient.user.defaultNode,slid);
				anclient.user.syncup();
				return slid;
			},
			syncup: function() {
				var outdata = {
					lastid: localStorage.getItem('an-localid-'+anclient.user.defaultNode),
					inventory: localStorage.getItem('an-localinventory-'+anclient.user.defaultNode)
				};
				anclient.comm.ajax_post('/api/session', {syncdata:JSON.stringify(outdata)});
			}
		},
		event: {
			listeners: {},
			/**
			 * @memberOf anclient.event
			 */
			on: function(evtype,cb) {
				if (typeof anclient.event.listeners[evtype]=='undefined') {
					anclient.event.listeners[evtype] = [];
				}
				anclient.event.listeners[evtype].push(cb);
			},
			off: function(evtype,cb) {
				if (typeof cb=='undefined') {
					anclient.event.listeners[evtype] = [];
				} else {
					if ((typeof anclient.event.listeners[evtype]!='undefined')&&(anclient.event.listeners[evtype].length>0)) {
						var nt = [];
						for(var i=0;i<anclient.event.listeners[evtype].length;i++) {
							if (anclient.event.listeners[evtype][i]!==cb) {
								nt.push(anclient.event.listeners[evtype][i]);
							}
						}
						anclient.event.listeners[evtype] = nt;
					}
				}
			},
			fire: function(evtype,evdata) {
				if (typeof evdata=='undefined') {
					evdata = null;
				}
				var evv = {'type':evtype,'data':evdata};
				console.log('event.fire: ',evv);
				if ((typeof anclient.event.listeners[evtype]!='undefined')&&(anclient.event.listeners[evtype].length>0)) {
					var r;
					var work = true;
					for(var i=0;i<anclient.event.listeners[evtype].length;i++) {
						if (work===true) {
							r = anclient.event.listeners[evtype][i].call(anclient,evv);
							if (r===false) work = false;
						}
					}
				}
			}
		},
		tool: {
			/**
			 * Converts an ArrayBuffer to a base64-encoded String.
			 * @param {ArrayBuffer} buffer
			 * @returns {String}
			 * @memberOf anclient.tool
			 */
			abuf2b64: function( buffer ) {
			    var binary = '';
			    var bytes = new Uint8Array( buffer );
			    var len = bytes.byteLength;
			    for (var i = 0; i < len; i++) {
			        binary += String.fromCharCode( bytes[ i ] );
			    }
			    return window.btoa( binary );
			}
		},
		form: {
			/**
			 * Get data as an object with item name-value pairs from a form.
			 * Due to file handling capability and FileReader's M.O., it returns a promise, 
			 * whose resolve callback gets the form data object as its sole parameter.
			 * Skips all form items that have CSS class 'form-skip'. 
			 * @param {String} formslc CSS selector for the form
			 * @return {Promise}
			 * @memberOf anclient.form
			 */
			data_to_object: function(formslc) {
				return new Promise(function(resolve,reject) {
					var inobj = $(formslc);
					var form;
					if (inobj.prop('tagName')=='FORM') {
						form = inobj;
					} else {
						form = inobj.parents('form');
					}
					var fd = form.serializeArray();
					var fins = {}, rn = '';
					for(var i=0;i<fd.length;i++) {
						var fie = form.find('[name="'+fd[i].name+'"]').first();
						if (fie.hasClass('form-skip')===false) {
							if (fd[i].name.indexOf('[')>0) {
								rn = fd[i].name.substr(0,fd[i].name.length-2);
								if (typeof fins[rn]=='undefined') {
									fins[rn] = [];
								}
								fins[rn].push(fd[i].value);
							} else {
								fins[fd[i].name] = fd[i].value;
							}
						}
					}
					var filez = [];
					form.find('input[type="file"]').each(function() {
						var fl = this.files;
						var fcn = $(this).attr('name');
						fins[fcn] = [];
						var fid;
						for(i=0;i<fl.length;i++) {
							fid = {'name':fl[i].name,'size':fl[i].size,'status':'reading','fob':fl[i]};
							filez.push(fid);
							fins[fcn].push(fid);
						}
					});
					if (filez.length==0) {
						resolve(fins);
					} else {
						for(i=0;i<filez.length;i++) {
							var fre = new FileReader();
							fre.onload = (function(ind) {
								return function(evt) {
									filez[ind]['status'] = undefined;
									filez[ind]['fob'] = undefined;
									delete(filez[ind]['status']);
									delete(filez[ind]['fob']);
									filez[ind]['contents'] = anclient.tool.abuf2b64(evt.target.result);
									if (ind==(filez.length-1)) {
										resolve(fins);
									}
								};
							})(i);
							fre.readAsArrayBuffer(filez[i].fob);
						}
					}
				});
			},
			/**
			 * Fill a HTML form with data
			 * @param {String} formslc CSS selector for the form
			 * @param {Object} fdata plain object containing form item name-value pairs
			 */
			object_to_data: function(formslc,fdata) {
				var e,et,ha;
				$(formslc+' [type="checkbox"]').prop('checked',false);
				for(var n in fdata) {
					ha = false;
					e = $(formslc+' [name="'+n+'"]');
					if (e.length>0) {
						if (e.length>1) {
							if (e.first().attr('type')==='radio') {
								$(formslc+' [name="'+n+'"]').filter('[value="'+fdata[n].toString()+'"]').prop('checked',true);
								ha = true;
							}
							else if (e.first().attr('type')==='checkbox') {
								if (Object.prototype.toString.call(fdata[n])!=='[object Array]') {
									fdata[n] = [fdata[n]];
								}
								for(var i=0;i<fdata[n].length;i++) {
									$(formslc+' [name="'+n+'"]').filter('[value="'+fdata[n][i].toString()+'"]').prop('checked',true);
								}
							}
						} else {
							e = e.first();
							et = e.attr('type');
							if (et!==undefined) {
								et = et.toLowerCase();
								if (et=='radio') {
									$(formslc+' [name="'+n+'"]').filter('[value="'+fdata[n].toString()+'"]').prop('checked',true);
									ha = true;
								}
								else if (et=='checkbox') {
									if (e.attr('value')==fdata[n]) {
										e.prop('checked',true);
										ha = true;
									}
								}
							}
							if (ha===false) {
								if (e.prop('tagName')=='SELECT') {
									if (e.prop('multiple')===true) {
										if (Object.prototype.toString.call(fdata[n])!=='[object Array]') {
											fdata[n] = [fdata[n]];
										}
										e.find('option').each(function() {
											if ($.inArray($(this).attr('value'),fdata[n])) {
												$(this).prop('selected',true);
											} else {
												$(this).prop('selected',false);
											}
										});
									} else {
										if (Object.prototype.toString.call(fdata[n])==='[object Array]') {
											fdata[n] = fdata[n][0];
										}
										e.val(fdata[n]);
									}
								} else {
									e.val(fdata[n]);
								}
							}
						}
					} else {
						console.log('form.err: no matching field for '+n+' under selector '+formslc);
					}
				}
			},
			show_hints_for_what: function(evt) {
				var m = anclient.taxonomy.get_match($('#an-form-what-entry').val());
				if ((evt.which==13)&&(m.length>0)) {
					evt.preventDefault();
					anclient.form.set_term(m[0].ctxchange);
				} else {
					var res = '';
					for(var i=0;i<m.length;i++) {
						res += '<span class="tag label label-info label-sm term" data-role="hint" data-key="'+m[i].ctxchange+'" data-context="'+m[i].ctxchange+'">'+m[i].label_primary+' <span class="category">('+m[i].label_secondary+')</span></span> ';
					}
					$('#an-form-what-hints').html(res);
				}
			},
			show_hints_for_attrs: function(evt) {
				var m = anclient.taxonomy.get_match($('#an-form-attrs-entry').val());
				if ((evt.which==13)&&(m.length>0)) {
					evt.preventDefault();
					anclient.form.add_attr(m[0].key, 'an-form-attrs');
				} else {
					var res = '';
					for(var i=0;i<m.length;i++) {
						res += '<span class="tag label label-info label-sm prop" data-role="hint" data-key="'+m[i].key+'">'+m[i].label_primary+'</span> ';
					}
					$('#an-form-attrs-hints').html(res);
				}
			},
			show_hints_for_attrsnot: function(evt) {
				var m = anclient.taxonomy.get_match($('#an-form-attrsnot-entry').val());
				if ((evt.which==13)&&(m.length>0)) {
					evt.preventDefault();
					anclient.form.add_attr(m[0].key, 'an-form-attrsnot');
				} else {
					var res = '';
					for(var i=0;i<m.length;i++) {
						res += '<span class="tag label label-info label-sm prop" data-role="hint" data-key="'+m[i].key+'">'+m[i].label_primary+'</span> ';
					}
					$('#an-form-attrsnot-hints').html(res);
				}
			},
			redraw_attr: function(v,field) {
				var o = anclient.taxonomy.get_item_by_path($('#an-form-what-value').val());
				if (typeof field=='undefined') {
					field = 'an-form-attrs';
				}
				$('#'+field+'-entry').val('').focus();
				var cl = '';
				for(var i=0;i<v.length;i++) {
					cl += '<span class="tag label label-primary label-sm prop" data-role="partvalue" data-key="'+o.props[v[i]].key+'">'+o.props[v[i]].labels.primary+'&nbsp;&nbsp;<span class="glyphicon glyphicon-remove-sign"></span></span> ';
				}
				$('#'+field+'-value').val(v.join(','));
				$('#'+field+'-labels').html(cl);
				$('#'+field+'-hints').html('');
			},
			add_attr: function(key,field) {
				if (typeof field=='undefined') {
					field = 'an-form-attrs';
				}
				var v = $('#'+field+'-value').val();
				if (v!='') {
					v = v.toString().split(',');
				} else {
					v = [];
				}
				if ($.inArray(key,v)<0) {
					v.push(key);
				}
				anclient.form.redraw_attr(v, field);
			},
			remove_attr: function(key,field) {
				if (typeof field=='undefined') {
					field = 'an-form-attrs';
				}
				var v = $('#'+field+'-value').val();
				if (v!='') {
					v = v.toString().split(',');
					var nv = [];
					for(var i=0;i<v.length;i++) {
						if (v[i]!=key) {
							nv.push(v[i]);
						}
					}
					v = nv;
				} else {
					v = [];
				}
				anclient.form.redraw_attr(v, field);
			},
			set_term: function(v) {
				var ctype = $('#an-major-form').data('currenttype');
				if (v=='') {
					anclient.taxonomy.create_hints(null);
					$('#an-form-what-label').html('');
					$('#an-form-what-value').val('');
					$('#an-form-attrs,#an-form-attrsnot,#an-form-qty').hide();
					$('#an-form-attrs-value,#an-form-attrs-entry,#an-form-attrsnot-value,#an-form-attrsnot-entry').val('');
					$('#an-form-what-entry').show().val('').focus();
					$('#an-form-toolbar').hide();
					$('#an-form-toolbar2').show();
				} else {
					$('#an-form-what-entry').val('').hide();
					$('#an-form-what-value').val(v);
					anclient.taxonomy.create_hints(v);
					var o = anclient.taxonomy.get_item_by_path(v);
					$('#an-form-what-label').html('<span class="tag label label-primary label-md term" data-role="termvalue">'+o.labels.primary+' <span class="category">('+o.catlabel+'/'+o.subcatlabel+')</span>&nbsp;&nbsp;<span class="glyphicon glyphicon-remove-sign"></span></span>').show();
					$('#an-form-what-hints').html('');
					var cl = '';
					for(var n in o.qtys) {
						if (o.qtys[n].legacy=='no') {
							cl += '<option value="'+o.qtys[n].key+'">'+o.qtys[n].labels+'</option>';
						}
					}
					$('#an-form-unit-value').html(cl);
					$('#an-form-attrs-value,#an-form-attrs-entry,#an-form-attrsnot-value,#an-form-attrsnot-entry').val('');
					$('#an-form-attrs,#an-form-qty').show();
					$('#an-form-attrs-hints,#an-form-attrs-labels').html('').show();
					if (ctype=='demand') {
						$('#an-form-attrsnot').show();
						$('#an-form-attrsnot-hints,#an-form-attrsnot-labels').html('').show();
					} else {
						$('#an-form-attrsnot').hide();
					}
					$('#an-form-toolbar2').hide();
					$('#an-form-toolbar').show();
					$('#an-form-attrs-entry').focus();
				}
			},
			/**
			 * @returns {Object}
			 */
			mainform_read: function() {
				var data = {
					_valid: true,
					localid: $('#an-form-entry-id').val(),
					'what': $('#an-form-what-value').val(),
					attrs: $('#an-form-attrs-value').val(),
					attrsnot: $('#an-form-attrsnot-value').val(),
					qty: parseFloat($('#an-form-qty-value').val()),
					unit: $('#an-form-unit-value').val(),
					start:'0000-00-00 00:00:00',
					end:'0000-00-00 00:00:00',
					assupply: false,
					browseable: false
				};
				if ($('#an-form-assupply').prop('checked')===true) {
					data.assupply = true;
				}
				if ($('#an-form-browseable').prop('checked')===true) {
					data.browseable = true;
					data.assupply = true;
				}
				if (data['what']=='') {
					data['_valid'] = false;
				} else {
					if (data['attrs']=='') {
						data['attrs'] = [];
					} else {
						data['attrs'] = data['attrs'].split(',');
					}
					if (data['attrsnot']=='') {
						data['attrsnot'] = [];
					} else {
						data['attrsnot'] = data['attrsnot'].split(',');
					}
				}
				return data;
			},
			/**
			 * @param {Object} data
			 * @param {String} ctype ('inventory') one of 'inventory', 'offer' or 'demand'
			 */
			mainform_init: function(data,ctype) {
				if (typeof ctype=='undefined') {
					ctype = 'inventory';
				}
				$('#an-major-form .forminfo').hide();
				$('#an-major-form .forminfo.'+ctype).show();
				$('#an-major-form').data('currenttype',ctype);
				if (typeof data=='undefined') {
					data = {
						localid: 0,
						'what':'',
						subtype: 'has',
						attrs:[],
						attrsnot:[],
						qty:0,
						unit:'pcs',
						start:'0000-00-00 00:00:00',
						end:'0000-00-00 00:00:00',
						assupply: true,
						browseable: false
					};
				}
				//WHAT
				$('#an-form-what-entry').off('keyup').on('keyup',anclient.form.show_hints_for_what);
				$('#an-form-what-hints').html('');
				//pick "what" from hints or remove current term
				$('#an-form-what-hints,#an-form-what-label').off('click').on('click',function(evt) {
					evt.preventDefault();
					var t = $(evt.target);
					if (t.attr('data-context')===undefined) {
						t = t.parents('span.term');
					}
					if (t.data('role')=='hint') {
						var v = t.data('context');
						anclient.form.set_term(v);
					} else {
						var v = $('#an-form-what-value').val();
						if (v!='') {
							var o = anclient.taxonomy.get_item_by_path(v);
							v = o.labels.primary;
						}
						anclient.form.set_term('');
						if (v!='') {
							$('#an-form-what-entry').val(v);
							anclient.form.show_hints_for_what({which:null});
						}
					}
				});
				//ATTRS
				$('#an-form-attrs-entry').off('keyup').on('keyup',anclient.form.show_hints_for_attrs);
				//pick or remove from "attrs"
				$('#an-form-attrs-hints,#an-form-attrs-labels').html('').off('click').on('click',function(evt) {
					evt.preventDefault();
					var t = $(evt.target);
					if (t.attr('data-key')===undefined) {
						t = t.parents('span.prop');
					}
					var v = t.data('key');
					if (t.data('role')=='hint') {
						$('#an-form-attrs-entry').val('');
						anclient.form.add_attr(v, 'an-form-attrs');
					} else {
						anclient.form.remove_attr(v, 'an-form-attrs');
					}
				});
				//ATTRSNOT
				$('#an-form-attrsnot-entry').off('keyup').on('keyup',anclient.form.show_hints_for_attrsnot);
				//pick or remove from "attrsnot"
				$('#an-form-attrsnot-hints,#an-form-attrsnot-labels').html('').off('click').on('click',function(evt) {
					evt.preventDefault();
					var t = $(evt.target);
					if (t.attr('data-key')===undefined) {
						t = t.parents('span.prop');
					}
					var v = t.data('key');
					if (t.data('role')=='hint') {
						$('#an-form-attrsnot-entry').val('');
						anclient.form.add_attr(v, 'an-form-attrsnot');
					} else {
						anclient.form.remove_attr(v, 'an-form-attrsnot');
					}
				});
				//BUTTONS
				$('#an-form-save').off('click').on('click',function(evt) {
					evt.preventDefault();
					var d = anclient.form.mainform_read();
					if (d['_valid']===true) {
						delete(d['_valid']);
						console.log(d);
						if (ctype=='inventory') {
							d['subtype'] = 'has';
							anclient.inventory.update_item(d).then(function(newd) {
								if (d['localid']!=newd['localid']) {
									anclient.event.fire('inventory.create', newd);
								} else {
									anclient.event.fire('inventory.update', newd);
								}
								anclient.screens.set('inventory');
							});
						}
					}
				});
				$('#an-form-delete').off('click').on('click',function(evt) {
					evt.preventDefault();
					var d = anclient.form.mainform_read();
					if (d['localid']!=0) {
						d['subtype'] = 'erase';
						anclient.inventory.update_item(d).then(function(newd) {
							if (newd['localid']===false) {
								anclient.event.fire('inventory.erase', newd);
							}
							anclient.screens.set('inventory');
						});
					}
				});
				$('#an-form-cancel,#an-form-cancel2').off('click').on('click',function(evt) {
					evt.preventDefault();
					anclient.screens.set('inventory');
					anclient.alerts.add('boss is the new boss');
				});
				//SET UP
				anclient.form.set_term(data['what']);
				if (data['what']!='') {
					$('#an-form-entry-id').val(data['localid']);
					if (Object.prototype.toString.call(data['attrs'])!=='[object Array]') {
						if (data['attrs'].toString().substr(0,1)=='[') {
							data['attrs'] = JSON.parse(data['attrs']);
						} else {
							data['attrs'] = data['attrs'].split(',');
						}
					}
					anclient.form.redraw_attr(data['attrs'], 'an-form-attrs');
					if (ctype=='demand') {
						if (Object.prototype.toString.call(data['attrsnot'])!=='[object Array]') {
							if (data['attrsnot'].toString().substr(0,1)=='[') {
								data['attrsnot'] = JSON.parse(data['attrsnot']);
							} else {
								data['attrsnot'] = data['attrsnot'].split(',');
							}
						}
						anclient.form.redraw_attr(data['attrsnot'], 'an-form-attrsnot');
					}
					$('#an-form-qty-value').val(data['qty']);
					$('#an-form-unit-value').val(data['unit']);
					if (ctype=='inventory') {
						$('#an-form-assupply').prop('checked',false);
						$('#an-form-browseable').prop('checked',false);
						if (data['assupply']===true) {
							$('#an-form-assupply').prop('checked',true);
						}
						if (data['browseable']===true) {
							$('#an-form-browseable').prop('checked',true);
						}
					}
				} else {
					$('#an-form-qty-value').val('1');
					$('#an-form-assupply,#an-form-browseable').prop('checked',true);
				}
				if (data['localid']==0) {
					$('#an-form-delete').hide();
				} else {
					$('#an-form-delete').show();
				}
				anclient.screens.set('form-float');
			}
		},
		screens: {
			/**
			 * @memberOf anclient.screens
			 */
			init: function() {
				$('.an-menu').off('click').on('click',function(evt) {
					evt.preventDefault();
					$('ul.nav').find('li').removeClass('active');
					$(this).parents('li').addClass('active');
					anclient.screens.set($(this).attr('href').substr(4));
				});
			},
			set: function(which) {
				$('.an-screen').hide();
				$('#an-'+which).show();
				if (which=='browse-supplies') {
					anclient.browser.execute();
				}
			}
		},
		alerts: {
			/**
			 * @memberOf anclient.alerts
			 */
			add: function(alertt,classy) {
				if (typeof classy=='undefined') {
					classy = 'info';
				}
				var al = '<div class="alert alert-'+classy+'"><a href="#">&times;</a> '+alertt+'</div>';
				$('#an-notifications').append(al);
				$('.alert a').off('click').on('click',function(evt) {
					evt.preventDefault();
					var alr = $(this).parents('div.alert');
					alr.remove();
				});
			}
		},
		inventory: {
			data: [],
			pointers: {},
			table_instance: null,
			/**
			 * @memberOf anclient.inventory
			 */
			update_pointers: function() {
				anclient.inventory.pointers = {};
				for(var i=0;i<anclient.inventory.data.length;i++) {
					anclient.inventory.pointers[anclient.inventory.data[i]['localid']] = {aindex:i,data:anclient.inventory.data[i]};
				}
			},
			get_item: function(localid) {
				if (typeof anclient.inventory.pointers[localid]=='undefined') {
					return null;
				}
				return anclient.inventory.pointers[localid]['data'];
			},
			get_filtered: function(which) {
				var x = [];
				for(var n in anclient.inventory.pointers) {
					if ((anclient.inventory.pointers[n]['data']['subtype']=='has')&&(which=='inventory')) {
						x.push(anclient.inventory.pointers[n]['data']);
					}
					else if ((anclient.inventory.pointers[n]['data']['subtype']=='want')&&(which=='demand')) {
						x.push(anclient.inventory.pointers[n]['data']);
					}
				}
				return x;
			},
			init: function() {
				return new Promise(function(res,rej) {
					// this is a promise to allow for syncing with a server
					var li = localStorage.getItem('an-localinventory-'+anclient.user.uid);
					if (li!==null) {
						anclient.inventory.data = JSON.parse(li);
					}
					anclient.inventory.update_pointers();
					anclient.inventory.draw_table();
					res();
				});
			},
			save: function() {
				anclient.inventory.update_pointers();
				localStorage.setItem('an-localinventory-'+anclient.user.defaultNode,JSON.stringify(anclient.inventory.data));
				anclient.user.syncup();
			},
			update_item: function(data) {
				return new Promise(function(res,rej) {
					// this is a promise to allow for syncing with a server
					if (data['localid']==0) {
						//create new item
						data['localid'] = anclient.user.get_local_unique_id();
						data['demandid'] = null;
						anclient.inventory.data.push(data);
					} else {
						if (typeof anclient.inventory.pointers[data['localid']]=='undefined') {
							data['localid'] = anclient.user.get_local_unique_id();
							data['demandid'] = null;
							anclient.inventory.data.push(data);
						} else {
							var ai = anclient.inventory.pointers[data['localid']].aindex;
							if ((data['subtype']=='erase')||(data['what']=='')) {
								anclient.inventory.data.splice(ai,1);
								data['localid'] = false;
							} else {
								if (typeof anclient.inventory.data[ai]['demandid']=='undefined') {
									anclient.inventory.data[ai]['demandid'] = null;
								}
								data['demandid'] = anclient.inventory.data[ai]['demandid'];
								anclient.inventory.data[ai] = data;
							}
						}
					}
					if ((data['localid']!==false)&&((data['subtype']=='want')||(data['assupply']===true)||(data['browseable']===true))) {
						var coords = anclient.geo.current.split(',');
						anclient.comm.ajax_post('/api/com',{
							service:'an',
							msg: [
							      {
							    	  cmd:'s',
							    	  content: {
							    		  msgid:data['localid'],
							    		  'what':data['what'],
							    		  attrs:data['attrs'],
							    		  attrsnot:data['attrsnot'],
							    		  qty:data['qty'],
							    		  unit:data['unit'],
							    		  long:coords[0],
							    		  lat:coords[1],
							    		  start:data['start'],
							    		  end:data['end'],
							    		  reason:'',
							    		  state:'',
							    		  parentid:'',
							    		  'public':data['browseable']
							    	  }
							      }
							      ]
						});
					}
					anclient.inventory.update_pointers();
					anclient.inventory.save();
					anclient.inventory.draw_table();
					res(data);
				});
			},
			draw_table: function() {
				if (anclient.inventory.table_instance===null) {
					anclient.inventory.table_instance = $('#an-store-table').DataTable({
						data: anclient.inventory.get_filtered('inventory'),
						order: [[1,'asc']],
						keys: false,
						pageLength: 25,
						dom: 	"<'row'<'col-sm-4'<'#an-inv-tools'>><'col-sm-4'l><'col-sm-4'f>>" +
								"<'row'<'col-sm-12'tr>>" +
								"<'row'<'col-sm-5'i><'col-sm-7'p>>",
						columns: [
						          {
						        	  data:'localid',
						        	  searchable: false,
						        	  orderable: false,
						        	  title: 'ID',
						        	  visible: false,
						        	  type: 'num'
						          },
						          {
						        	  data:'what',
						        	  searchable: true,
						        	  orderable: true,
						        	  title: 'What',
						        	  visible: true,
						        	  type: 'string',
						        	  width: '50%',
						        	  render: function(data,type,row,meta) {
						        		  var o = anclient.taxonomy.get_item_by_path(data);
						        		  if (type=='display') {
							        		  var out = '<span class="an-list-hidden-id">'+row['localid']+'</span><span class="an-list-term">'+o.labels.primary+'</span><br>';
							        		  var spl = row['attrs'];
							        		  for(var i=0;i<spl.length;i++) {
							        			  out += '<span class="label label-info">'+o.props[spl[i]].labels.primary+'</span> ';
							        		  }
							        		  return out;
						        		  }
						        		  else if ((type=='sort')||(type=='filter')) {
						        			  return o.labels.primary;
						        		  }
						        		  else {
						        			  return data;
						        		  }
						        	  }
						          },
						          {
						        	  data:'qty',
						        	  searchable:false,
						        	  orderable:true,
						        	  title:'Qty',
						        	  visible:true,
						        	  className:'text-right',
						        	  type:'num',
						        	  render: function(data,type,row,meta) {
						        		  var o = anclient.taxonomy.get_item_by_path(row['what']);
						        		  if (type=='display') {
						        			  return data+' '+o.qtys[row['unit']].labels;
						        		  } else {
						        			  return data;
						        		  }
						        	  }
						          },
						          {
						        	  searchable:false,
						        	  orderable:true,
						        	  title:'Shared',
						        	  visible:true,
						        	  type:'string',
						        	  render: function(data,type,row,meta) {
						        		  if (row['browseable']===true) {
						        			  return '<span class="glyphicon glyphicon-asterisk" title="shared as public supply"></span>';
						        		  }
						        		  else if (row['assupply']===true) {
						        			  return '<span class="glyphicon glyphicon-ok" title="shared as supply for matching"></span>';
						        		  }
						        		  return '';
						        	  }
						          },
						          {
						        	  searchable:false,
						        	  orderable:true,
						        	  title:'In demand',
						        	  visible:true,
						        	  type:'string',
						        	  render: function(data,type,row,meta) {
						        		  if (typeof row['demandid']=='undefined') return '';
						        		  if (row['demandid']!==null) {
						        			  return '<span class="glyphicon glyphicon-paperclip" title="in demand"></span>';
						        		  }
						        		  return '';
						        	  }
						          }
						]
					});
					$('#an-inv-tools').html('<button class="btn btn-warning" id="an-inventory-new"><span class="glyphicon glyphicon-plus-sign"></span> New entry</button>');
					$('#an-inventory-new').off('click').on('click',function(evt) {
						evt.preventDefault();
						anclient.form.mainform_init();
					});
					$('#an-store-table').off('tap').on('tap',function(evt) {
						evt.preventDefault();
						var rowid = $(evt.target).parents('tr').find('.an-list-hidden-id');
						if (rowid.length>0) {
							rowid = rowid.text();
						} else {
							rowid = null;
						}
						if (rowid!==null) {
							var o = anclient.inventory.get_item(rowid);
							if (o!==null) {
								anclient.form.mainform_init(o, 'inventory');
							}
						}
					});
					$('#an-store-table').off('press').on('press',function(evt) {
						var row = $(evt.target).parents('tr');
						if (row.hasClass('selected')) {
							anclient.inventory.table_instance.row(row.get(0)).deselect();
						} else {
							anclient.inventory.table_instance.row(row.get(0)).select();
						}
					});
					//anclient.inventory.table_instance.on('');
				} else {
					anclient.inventory.table_instance.clear();
					anclient.inventory.table_instance.rows.add(anclient.inventory.get_filtered('inventory'));
					anclient.inventory.table_instance.draw();
				}
			}
		},
		browser: {
			data: [],
			table_instance: null,
			/**
			 * @memberOf anclient.browser
			 */
			execute: function() {
				return new Promise(function(res,rej) {
					anclient.comm.ajax_get('/api/com', {
						'service':'an',
						'query':JSON.stringify({'type':'s'})
					}).then(function(d) {
						anclient.browser.draw_table(d['result']['page']);
						anclient.screens('browse-supplies');
					});
				});
			},
			draw_table: function(datas) {
				anclient.browser.data = datas;
				if (anclient.browser.table_instance===null) {
					anclient.browser.table_instance = $('#an-public-table').DataTable({
						data: datas,
						order: [[1,'asc']],
						keys: false,
						pageLength: 25,
						dom: 	"<'row'<'col-sm-4'<'#an-inv-tools'>><'col-sm-4'l><'col-sm-4'f>>" +
								"<'row'<'col-sm-12'tr>>" +
								"<'row'<'col-sm-5'i><'col-sm-7'p>>",
						columns: [
						          {
						        	  data:'msgid',
						        	  searchable: false,
						        	  orderable: false,
						        	  title: 'ID',
						        	  visible: false,
						        	  type: 'num'
						          },
						          {
						        	  data:'what',
						        	  searchable: true,
						        	  orderable: true,
						        	  title: 'What',
						        	  visible: true,
						        	  type: 'string',
						        	  width: '50%',
						        	  render: function(data,type,row,meta) {
						        		  var o = anclient.taxonomy.get_item_by_path(data);
						        		  if (type=='display') {
							        		  var out = '<span class="an-list-hidden-id">'+row['msgid']+'</span><span class="an-list-term">'+o.labels.primary+'</span><br>';
							        		  var spl = JSON.parse(row['attrs']);
							        		  for(var i=0;i<spl.length;i++) {
							        			  out += '<span class="label label-info">'+o.props[spl[i]].labels.primary+'</span> ';
							        		  }
							        		  /*
							        		  var spl = JSON.parse(row['attrsnot']);
							        		  for(var i=0;i<spl.length;i++) {
							        			  out += '<span class="label label-danger">- '+o.props[spl[i]].labels.primary+'</span> ';
							        		  }
							        		  */
							        		  return out;
						        		  }
						        		  else if ((type=='sort')||(type=='filter')) {
						        			  return o.labels.primary;
						        		  }
						        		  else {
						        			  return data;
						        		  }
						        	  }
						          },
						          {
						        	  data:'qty',
						        	  searchable:false,
						        	  orderable:true,
						        	  title:'Qty',
						        	  visible:true,
						        	  className:'text-right',
						        	  type:'num',
						        	  render: function(data,type,row,meta) {
						        		  var o = anclient.taxonomy.get_item_by_path(row['what']);
						        		  if (type=='display') {
						        			  return data+' '+o.qtys[row['unit']].labels;
						        		  } else {
						        			  return data;
						        		  }
						        	  }
						          }
						]
					});
					$('#an-public-table').off('tap').on('tap',function(evt) {
						evt.preventDefault();
						var rowid = $(evt.target).parents('tr').find('.an-list-hidden-id');
						if (rowid.length>0) {
							rowid = rowid.text();
						} else {
							rowid = null;
						}
						if (rowid!==null) {
							var o = anclient.inventory.get_item(rowid);
							if (o!==null) {
								anclient.form.mainform_init(o, 'inventory');
							}
						}
					});
				} else {
					anclient.browser.table_instance.clear();
					anclient.browser.table_instance.rows.add(datas);
					anclient.browser.table_instance.draw();
				}
			}
		},
		comm: {
			apibase: {},
			urlprefix: 'http://assist-network.herokuapp.com/',
			/**
			 * @memberOf anclient.comm
			 */
			ajax_post: function(url,params) {
				if (typeof params=='undefined') {
					params = {};
				}
				return anclient.comm.ajax(url,params,'POST');
			},
			ajax_get: function(url,params) {
				if (typeof params=='undefined') {
					params = {};
				}
				return anclient.comm.ajax(url,params,'GET');
			},
			ajax: function(url,params,meth) {
				if (url=='') {
					url = anclient.comm.urlprefix+'api/com';
				}
				else if (url.substr(0,1)=='/') {
					url = anclient.comm.urlprefix+url.substr(1);
				}
				if (typeof params=='undefined') {
					params = {};
				}
				if (typeof meth=='undefined') {
					meth = 'GET';
				}
				params['auth_token'] = anclient.user.sessionid;
				params['node'] = anclient.user.defaultNode;
				return new Promise(function(res,rej) {
					var ajaxparam = {
							beforeSend:function() {
								$('.loading').show();
								return true;
							},
							dataType:'json',
							error:function(xhr,tst,err) {
								$('.loading').hide();
								anclient.event.fire('comm.error', {type:'ajax',error:err,errtx:tst,xhr:xhr,url:url,params:params});
								rej(tst,err);
							},
							method:meth,
							success:function(dt) {
								$('.loading').hide();
								anclient.event.fire('comm.success', {type:'ajax',url:url,params:params,result:dt});
								res(dt);
							}
						};
					if (meth=='GET') {
						ajaxparam['data'] = params;
					}
					else if (meth=='POST') {
						ajaxparam['contentType'] = 'application/json';
						ajaxparam['data'] = JSON.stringify(params);
						ajaxparam['processData'] = false;
					}
					$.ajax(url,ajaxparam);
				});
			}
		},
		geo: {
			current: '47.539063,19.049691',
			/**
			 * @memberOf anclient.geo
			 * @public
			 */
			get_pos: function() {
				return new Promise(function(res,rej) {
					if (localStorage.getItem('an-lastlatlon')===null) {
						anclient.geo.current = '47.539063,19.049691';
					} else {
						anclient.geo.current = localStorage.getItem('an-lastlatlon');
					}
					navigator.geolocation.getCurrentPosition(function(psn) {
						anclient.geo.current = psn.coords.latitude.toString()+','+psn.coords.longitude.toString();
						localStorage.setItem('an-lastlatlon',anclient.geo.current);
						anclient.event.fire('geo.position', anclient.geo.current);
						res(anclient.geo.current);
					},function() {
						console.log('geo.err: no geolocation available, using last known pos');
						anclient.event.fire('geo.error');
						rej();
					});
				});
			}
		},
		init: function() {
			$('#an-username').text('');
			$(".dropdown-toggle").dropdown();
			//if we need to wait for geopos for login, this tool can be used as a promise
			anclient.geo.get_pos();
			anclient.comm.ajax_get('/api/').then(function(d) {
				anclient.comm.apibase = d;
				anclient.taxonomy.load_data().then(function() {
					anclient.screens.init();
					anclient.screens.set('dashboard');
					$('#an-login-node1').off('click').on('click',function(evt) {
						evt.preventDefault();
						anclient.user.defaultNode = '1';
						anclient.user.login().then(function() {
							anclient.screens.set('inventory');
						});
					});
					$('#an-login-node2').off('click').on('click',function(evt) {
						evt.preventDefault();
						anclient.user.defaultNode = '2';
						anclient.user.login().then(function() {
							anclient.screens.set('inventory');
						});
					});
				});
			});
		}
};

$(document).ready(anclient.init);
