define('app/controllers/keys', [
    'app/models/key',
    'ember',
    'jquery'
    ],
    /**
     * Keys controller
     *
     * @returns Class
     */
    function(Key) {
        return Ember.ArrayController.extend({

            keys: null,
            loadingKeys: null,

            init: function() {
                this._super();
                this.loadKeys();
            },

            loadKeys: function() {
                this.set('loadingKeys', true);
                $.ajax({
                    url: '/keys',
                    type: 'GET',
                    success: function(data) {
                        info('Successfully loaded keys');
                        Mist.keysController.set('loadingKeys', false);
                        Mist.keysController.updateKeysList(data);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        Mist.notificationController.notify('Error while loading keys: ' + jqXHR.responseText);
                        error(textstate, errorThrown, ' while loading keys. ', jqXHR.responseText);
                        Mist.keysController.set('loadingKeys', false);
                    }
                });
            },

            newKey: function(name, privateKey, machine, autoSelect) {
                var item = {
                    'name': name,
                    'priv': privateKey
                };
                $.ajax({
                    url: '/keys',
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(item),
                    success: function(data) {
                        info('Successfully created key: ', name);
                        $('#create-key-dialog').popup('close');
                        Mist.keyAddController.newKeyClear();
                        Mist.keysController.keys.addObject(Key.create(data));
                        if (autoSelect) {
                            Ember.run.next(function(){
                                $('.select-key-collapsible .select-listmenu').listview();
                                $('.select-key-collapsible').parent().trigger('create');
                                $('.select-key-collapsible li a').eq(0).click();
                                $('.select-key-collapsible').removeClass('ui-disabled');
                            });
                        } else if (machine) {
                            Mist.keysController.associateKey(name, machine);
                            $('#manage-keys .ajax-loader').fadeIn(200);
                        } else {
                            Ember.run.next(function() {
                                $('#keys-list').listview('refresh');
                                $('#keys-list input.ember-checkbox').checkboxradio();
                            });
                        }
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                        Mist.notificationController.notify('Error while creating key: ' + jqXHR.responseText);
                        error(textstate, errorThrown, ' while creating key: ', name, '. ', jqXHR.responseText);
                    }
                });
                item.priv = privateKey = null; // Don't keep private key on client
            },

            deleteKey: function(name) {
                $.ajax({
                    url: '/keys/' + name,
                    type: 'DELETE',
                    success: function(data) {
                        info('Successfully deleted key: ', name);
                        Mist.keysController.updateKeysList(data);
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                        Mist.notificationController.notify('Error while deleting key: ' + jqXHR.responseText);
                        error(textstate, errorThrown, ' while deleting key: ', name, '. ', jqXHR.responseText);
                    }
                });
            },

            editKey: function(oldName, newName) {
                var item = {
                    'newName': newName,
                };
                $.ajax({
                    url: '/keys/' + oldName,
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(item),
                    success: function() {
                        info('Successfully edited key: ', oldName);
                        Mist.keysController.getKeyByName(oldName).set('name', newName);
                        $("#edit-key-dialog").popup("close");
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                        Mist.notificationController.notify('Error while editting key: ' + jqXHR.responseText);
                        error(textstate, errorThrown, ' while editting key: ', oldName, '. ', jqXHR.responseText);
                    }
                });
            },

            setDefaultKey: function(name) {
                $.ajax({
                    url: '/keys/' + name,
                    type: 'POST',
                    success: function() {
                        info('Successfully set default key: ', name);
                        Mist.keysController.keys.forEach(function(key) {
                            if (key.name == name) {
                                key.set('default_key', true);
                            } else {
                                key.set('default_key', false);
                            }
                        });
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                        Mist.notificationController.notify('Error while setting default key: ' + jqXHR.responseText);
                        error(textstate, errorThrown, ' while setting default key: ', name, '. ', jqXHR.responseText);
                    }
                });
            },

            associateKey: function(keyName, machine) {
                var payload = {
                    'key_id': keyName,
                    'backend_id': machine.backend.id,
                    'machine_id': machine.id,
                    'host': machine.getHost()
                };
                $.ajax({
                    url: '/backends/' + machine.backend.id + '/machines/' + machine.id + '/keys/' + keyName,
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(payload),
                    success: function(data) {
                        info('Successfully associated key: ', keyName, ', with machine: ', machine.id);
                        $('#manage-keys .ajax-loader').fadeOut(200);
                        Mist.keysController.updateKeyMachineList(keyName, data);
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                        Mist.notificationController.notify('Error while associating key: ' + keyName);
                        error(textstate, errorThrown, ' while associating key: ', keyName, '. ', jqXHR.responseText);
                        $('#manage-keys .ajax-loader').fadeOut(200);
                    }
                });
            },

            disassociateKey: function(keyName, machine) {
                var backend_id = null;
                if (machine.isGhost && (!machine.backend.id)) {
                    backend_id = machine.backend;
                } else {
                    backend_id = machine.backend.id;
                }
                var payload = {
                    'key_id': keyName,
                    'backend_id': backend_id,
                    'machine_id': machine.id,
                    'host': machine.isGhost ? null : machine.getHost(),
                };
                $.ajax({
                    url: '/backends/' + backend_id + '/machines/' + machine.id + '/keys/' + keyName,
                    type: 'DELETE',
                    contentType: 'application/json',
                    data: JSON.stringify(payload),
                    success: function(data) {
                        info('Successfully disassociated key: ', keyName, ' with machine: ', machine.id);
                        $('#manage-keys .ajax-loader').fadeOut(200);
                        Mist.keysController.updateKeyMachineList(keyName, data);
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                        Mist.notificationController.notify('Error while disassociating key: ' + keyName);
                        error(textstate, errorThrown, ' while disassociating key: ', keyName, '. ', jqXHR.responseText);
                        $('#manage-keys .ajax-loader').fadeOut(200);
                    }
                });
            },

            getPrivKey: function(keyName, element) {
                $.ajax({
                    url: '/keys/' + keyName,
                    type: 'GET',
                    success: function(data) {
                        info('Successfully got private key: ' + keyName);
                        $(element).val(data).trigger('change');
                    },
                    error: function(jqXHR, textstate, errorThrown) {
                        Mist.notificationController.notify('Error while getting private key: ' + keyName);
                        error(textstate, errorThrown, ' while getting private key: ', keyName, '. ', jqXHR.responseText);
                    }
                });
            },

            getKeyByName: function(keyName) {
                for (var k = 0; k < this.keys.length; ++k) {
                    if (this.keys[k].name == keyName) {
                        return this.keys[k];
                    }
                }
                return null;
            },

            updateKeysList: function(data) {
                var keys = new Array();
                data.forEach(function(key) {
                    keys.push(Key.create(key));
                });
                this.set('keys', keys);
                Ember.run.next(function(){
                    try {
                        $('#keys-list').listview('refresh');
                        $('#keys-list input.ember-checkbox').checkboxradio();
                    } catch (e) {}
                });
            },

            updateKeyMachineList: function(keyName, data) {
                this.keys.some(function(key) {
                    if(key.name == keyName) {
                        key.set('machines', data ? data : new Array());
                        return true;
                    }
                });
            }
        });
    }
);
