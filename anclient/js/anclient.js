/**
 * spec at : https://docs.google.com/document/d/1Qw4u6ftavHCkzi5dxusGqDxuUzKxQRSgYhBVdTvT2Os
 */

var anclient = {
		serverreply: null,
		lang: 'hu',
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
			 */
			load_data: function() {
				return new Promise(function(res,rej) {
					if (localStorage.getItem('an-taxonomy')===null) {
						anclient.comm.ajax_get('http://www.pdx.hu/jobs/an/js/taxonomy.json').then(function(d) {
							anclient.taxonomy.data = d;
							anclient.taxonomy.convert_data();
							localStorage.setItem('an-taxonomy',JSON.stringify(d));
							console.log('ext: loaded taxonomy db');
							res();
						},function(stat,err) {
							console.log('ext.err: '+stat+' '+err);
							rej();
						});
					} else {
						/*
						 * we still need to add the new dictionary discovery feature
						 */
						anclient.taxonomy.data = JSON.parse(localStorage.getItem('an-taxonomy'));
						anclient.taxonomy.convert_data();
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
			defaultNode: 'node1',
			uid: null,
			uname: 'testuser',
			sessionid: null,
			udata: {},
			/**
			 * @returns {Promise}
			 */
			login: function(user,node) {
				if (typeof node=='undefined') {
					node = anclient.user.defaultNode;
				}
				if (typeof user=='undefined') {
					user = anclient.user.defaultUser;
				}
				return new Promise(function(res,rej) {
					var params = {email:user,node:node};
					anclient.comm.ajax_get('/api/login', params).then(function(d) {
						if (typeof d.success=='undefined') {
							console.log('login.err: malformed packet');
							rej();
						} else {
							if (d.success===true) {
								anclient.user.uid = d.uid;
								anclient.user.uname = d.name;
								anclient.user.sessionid = d.auth_token;
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
				var slid = localStorage.getItem('an-localid-'+anclient.user.uid);
				if (slid===null) {
					slid = 1;
				} else {
					++slid;
				}
				localStorage.getItem('an-localid-'+anclient.user.uid,slid);
				return slid;
			}
		},
		event: {
			listeners: {},
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
						res += '<span class="tag label label-default label-sm term" data-role="hint" data-key="'+m[i].ctxchange+'" data-context="'+m[i].ctxchange+'">'+m[i].label_primary+' <span class="category">('+m[i].label_secondary+')</span></span> ';
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
						res += '<span class="tag label label-default label-sm prop" data-role="hint" data-key="'+m[i].key+'">'+m[i].label_primary+'</span> ';
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
						res += '<span class="tag label label-default label-sm prop" data-role="hint" data-key="'+m[i].key+'">'+m[i].label_primary+'</span> ';
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
					$('#an-form-attrs-entry').focus();
				}
			},
			mainform_init: function(data,ctype) {
				if (typeof ctype=='undefined') {
					ctype = 'inventory';
				}
				$('#an-major-form .forminfo').hide();
				$('#an-major-form .forminfo.'+ctype).show();
				$('#an-major-form').data('currenttype',ctype);
				if (typeof data=='undefined') {
					data = {
						'what':'',
						attrs:[],
						attrsnot:[],
						qty:0,
						unit:'pcs',
						start:'0000-00-00 00:00:00'
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
				anclient.form.set_term(data['what']);
				if (data['what']!='') {
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
				}
			}
		},
		comm: {
			urlprefix: 'http://assist-network.herokuapp.com/',
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
				//params['auth_token'] = anclient.user.sessionid;
				return new Promise(function(res,rej) {
					$.ajax(url,{
						beforeSend:function() {
							$('.loading').show();
							return true;
						},
						//cache: false,
						contentType:'application/json',
						//crossDomain: true,
						//data:{params:JSON.stringify(params)},
						data:JSON.stringify(params),
						dataType:'json',
						error:function(xhr,tst,err) {
							$('.loading').hide();
							anclient.event.fire('comm.error', {type:'ajax',error:err,errtx:tst,xhr:xhr,url:url,params:params});
							rej(tst,err);
						},
						method:meth,
						processData: false,
						success:function(dt) {
							$('.loading').hide();
							anclient.event.fire('comm.success', {type:'ajax',url:url,params:params,result:dt});
							res(dt);
						}
					});
				});
			}
			//http://assist-network.herokuapp.com/api/login?params={%22email%22:%22user1@assist.network%22,%22node%22:%22node1%22}
		},
		geo: {
			current: '47.539063,19.049691',
			get_pos: function() {
				return new Promise(function(res,rej) {
					if (localStorage.getItem('an-lastlatlon')===null) {
						anclient.geo.current = '47.539063,19.049691';
					} else {
						anclient.geo.current = localStorage.getItem('an-lastlatlon');
					}
					navigator.geolocation.getCurrentPosition(function(psn) {
						anclient.geo.current = psn.coords.latitude.toString()+psn.coords.longitude.toString();
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
			anclient.taxonomy.load_data().then(function() {
				anclient.taxonomy.create_hints(null);
				$(".dropdown-toggle").dropdown();
				//if we need to wait for geopos for login, this tool can be used as a promise
				anclient.geo.get_pos();
				anclient.comm.ajax_get('/api/').then(function(d) {
					anclient.serverreply = d;
					anclient.form.mainform_init();
					anclient.user.login().then(function() {
						console.log('user login complete');
					});
				},function(stat,err) {
					console.log('ext.err: '+stat+' '+err);
				});
			});
		}
};

$(document).ready(anclient.init);
