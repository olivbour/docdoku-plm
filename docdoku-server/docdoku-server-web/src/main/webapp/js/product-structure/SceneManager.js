define([
    "views/marker_create_modal_view",
    "views/export_scene_modal_view",
    "views/controls_infos_modal_view"
], function (
    MarkerCreateModalView,
    ExportSceneModalView,
    ControlsInfosModalView
) {
    var SceneManager = function (options) {

        var options = options || {};

        var defaultsOptions = {
            typeLoader: 'binary',
            typeMaterial: 'face'
        };

        _.defaults(options, defaultsOptions);
        _.extend(this, options);

        this.loader = (this.typeLoader == 'binary') ? new THREE.BinaryLoader() : new THREE.JSONLoader();
        this.material = (this.typeMaterial == 'face') ? new THREE.MeshFaceMaterial() : (this.typeMaterial == 'lambert') ? new THREE.MeshLambertMaterial() : new THREE.MeshNormalMaterial();

        this.updateOffset = 0;
        this.updateCycleLength = 250;

        this.instances = [];
        this.instancesMap = {};
        this.partIterations = {};
        this.meshesBindedForMarkerCreation = [];

        this.defaultCameraPosition = new THREE.Vector3(0, 10, 1000);
        this.cameraPosition = new THREE.Vector3(0, 10, 1000);

        this.STATECONTROL = { PLC : 0, TBC : 1};
        this.stateControl = this.STATECONTROL.TBC;
        this.time = Date.now();
    };

    SceneManager.prototype = {

        init: function() {
            _.bindAll(this);
            this.initExportScene();
            this.initScene();
            this.initCamera();
            this.initControls();
            this.bindSwitchControlEvents();
            this.initLights();
            this.initAxes();
            this.initStats();
            this.initRenderer();
            this.loadWindowResize();
            this.initLayerManager();
            this.animate();
            this.initIframeScene();
            this.initShortcuts();
        },

        initExportScene: function() {

            var self = this;


            $("#export_scene_btn").click(function() {

                // Def url
                var splitUrl = window.location.href.split("/");
                var urlRoot = splitUrl[0] + "//" + splitUrl[2];

                var paths = self.rootCollection;

                var iframeSrc = urlRoot + '/visualization/' + APP_CONFIG.workspaceId + '/' + APP_CONFIG.productId
                    + '?cameraX=' + self.camera.position.x
                    + '&cameraY=' + self.camera.position.y
                    + '&cameraZ=' + self.camera.position.z
                    + '&pathToLoad=' + self.pathForIframeLink;

                // Open modal
                var esmv = new ExportSceneModalView({iframeSrc:iframeSrc});
                $("body").append(esmv.render().el);
                esmv.openModal();

            });
        },

        initScene: function() {
            this.$container = $('div#container');
            this.$blocker = $('div#blocker');
            this.$instructions = $('div#instructions');

            // Init frame
            if (this.$container.length === 0) {
                this.$container = $('div#frameContainer');
            }
            this.scene = new THREE.Scene();
        },

        initCamera: function() {
            this.camera = new THREE.PerspectiveCamera(45, this.$container.width() / this.$container.height(), 1, 50000);
            if (!_.isUndefined(SCENE_INIT.camera)) {
                console.log(SCENE_INIT.camera.x + ' , ' + SCENE_INIT.camera.y + ' , ' + SCENE_INIT.camera.z);
                this.camera.position.set(SCENE_INIT.camera.x, SCENE_INIT.camera.y, SCENE_INIT.camera.z);
            } //else
                //this.camera.position.set(0, 10, 10000);
            //this.scene.add(this.camera);
        },

        initControls: function() {

            switch(this.stateControl) {
                case this.STATECONTROL.PLC:
                    this.$blocker.show();
                    this.setPointerLockControls();
                    $('#flying_mode_view_btn').addClass("active");
                    break;
                case this.STATECONTROL.TBC:
                    this.$blocker.hide();
                    this.setTrackBallControls();
                    $('#tracking_mode_view_btn').addClass("active");
                    break;
            }


            if (Modernizr.touch) {
                $('#side_controls_container').hide();
                $('#scene_container').width(90 + '%');
                $('#center_container').height(83 + '%');
            }
        },

        bindSwitchControlEvents: function() {
            var self = this;
            $('#flying_mode_view_btn').click(function(e) {
                self.$blocker.show();
                self.updateNewCamera();
                //self.setFirstPersonControls();
                self.setPointerLockControls();
                self.updateLayersManager();
            });

            $('#tracking_mode_view_btn').click(function(e) {
                self.$blocker.hide();
                self.updateNewCamera();
                self.setTrackBallControls();
                self.updateLayersManager();
            });
        },

        setPointerLockControls: function() {
            if(this.controls != null) {
                this.controls.destroyControl();
                this.controls = null;
            }

            var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

            if ( havePointerLock ) {
                var self = this;
                var pointerlockchange = function ( event ) {
                    if ( document.pointerLockElement === self.$container[0] || document.mozPointerLockElement === self.$container[0] || document.webkitPointerLockElement === self.$container[0] ) {
                        self.controls.enabled = true;
                    } else {
                        self.controls.enabled = false;
                    }
                }

                // Hook pointer lock state change events
                document.addEventListener( 'pointerlockchange', pointerlockchange, false );
                document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
                document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

                this.$container[0].addEventListener( 'dblclick',  this.bindPointerLock , false );
            }

            this.controls = new THREE.PointerLockControlsCustom(this.camera, this.$container[0]);

            this.controls.moveToPosition(this.defaultCameraPosition);

            this.scene.add( this.controls.getObject() );

            this.stateControl = this.STATECONTROL.PLC;
        },

        bindPointerLock : function ( event ) {

            this.$blocker.hide();

            // Ask the browser to lock the pointer
            this.$container[0].requestPointerLock = this.$container[0].requestPointerLock || this.$container[0].mozRequestPointerLock || this.$container[0].webkitRequestPointerLock;

            if ( /Firefox/i.test( navigator.userAgent ) ) {

                document.addEventListener( 'fullscreenchange', this.fullscreenchange, false );
                document.addEventListener( 'mozfullscreenchange', this.fullscreenchange, false );

                this.$container[0].requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

                this.$container[0].requestFullscreen();

            } else {
                this.$container[0].requestPointerLock();
            }
        },

        // FullScreenChange for the PointerLockControl
        fullscreenchange : function ( event ) {

            if ( document.fullscreenElement === this.$container[0] || document.mozFullscreenElement === this.$container[0] || document.mozFullScreenElement === this.$container[0] ) {

                document.removeEventListener( 'fullscreenchange', fullscreenchange );
                document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

                this.$container[0].requestPointerLock();
            }

        },

        unbindPointerLock : function() {
            this.$container[0].removeEventListener( 'dblclick', this.bindPointerLock , false );
            document.removeEventListener( 'fullscreenchange', this.fullscreenchange, false );
            document.removeEventListener( 'mozfullscreenchange', this.fullscreenchange, false );
        },

        setTrackBallControls: function() {

            if(this.controls != null) {
                this.controls.destroyControl();
                this.controls = null;
            }

            this.controls = new THREE.TrackballControlsCustom(this.camera, this.$container[0]);

            this.controls.rotateSpeed = 3.0;
            this.controls.zoomSpeed = 10;
            this.controls.panSpeed = 1;

            this.controls.noZoom = false;
            this.controls.noPan = false;

            this.controls.staticMoving = true;
            this.controls.dynamicDampingFactor = 0.3;

            this.controls.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

            this.camera.position.set(this.defaultCameraPosition.x, this.defaultCameraPosition.y, this.defaultCameraPosition.z);
            this.scene.add(this.camera);

            this.stateControl = this.STATECONTROL.TBC;
        },

        updateNewCamera: function() {
            // Best solution but setting rotation does not work (waiting for bug fix in Threejs)
            //this.camera.position.set(0, 10, 10000);
            //this.camera.rotation.set(0, 0 , 0);

            // Remove camera from scene and save position
            if(this.stateControl == this.STATECONTROL.PLC) {
                this.cameraPosition = this.controls.getPosition();
                this.unbindPointerLock();
                this.scene.remove(this.controls.getObject());
            } else {
                this.cameraPosition = this.camera.position;
                this.scene.remove(this.camera);
            }

            this.initCamera();
            this.addLightsToCamera();
        },

        updateLayersManager: function() {
            if(this.stateControl == this.STATECONTROL.PLC) {
                this.layerManager.updateCamera(this.controls.getObject(), this.controls);
                this.layerManager.domEvent._isPLC = true;
            } else {
                this.layerManager.updateCamera(this.camera, this.controls);
                this.layerManager.domEvent._isPLC = false;
            }
        },

        startMarkerCreationMode: function(layer) {

            $("#scene_container").addClass("markersCreationMode");

            var self = this;

            if(self.stateControl == self.STATECONTROL.PLC) {
                this.domEventForMarkerCreation = new THREEx.DomEvent(this.controls.getObject(), this.$container);
                this.domEventForMarkerCreation._isPLC = true;
            } else {
                this.domEventForMarkerCreation = new THREEx.DomEvent(this.camera, this.$container);
                this.domEventForMarkerCreation._isPLC = false;
            }

            this.meshesBindedForMarkerCreation = _.pluck(_.filter(self.instances, function(instance) {
                return instance.mesh != null
            }), 'mesh');


            var onIntersect = function(intersectPoint) {
                var mcmv = new MarkerCreateModalView({model:layer, intersectPoint:intersectPoint});
                $("body").append(mcmv.render().el);
                mcmv.openModal();
            }

            var numbersOfMeshes = this.meshesBindedForMarkerCreation.length;

            for (var j = 0; j < numbersOfMeshes; j++) {
                self.domEventForMarkerCreation.bind(this.meshesBindedForMarkerCreation[j], 'click', function(e) {
                    onIntersect(e.target.intersectPoint);
                });
            }

        },

        stopMarkerCreationMode: function() {

            $("#scene_container").removeClass("markersCreationMode");

            $("#creationMarkersModal .btn-primary").off('click');
            var numbersOfMeshes = this.meshesBindedForMarkerCreation.length;
            for (var j = 0; j < numbersOfMeshes; j++) {
                this.domEventForMarkerCreation.unbind(this.meshesBindedForMarkerCreation[j], 'click');
            }
        },

        initLayerManager: function() {
            var self = this;
            require(["LayerManager"], function(LayerManager) {

                if(self.stateControl == self.STATECONTROL.PLC) {
                    self.layerManager = new LayerManager(self.scene, self.controls.getObject(), self.renderer, self.controls, self.$container);
                    self.layerManager.domEvent._isPLC = true;
                } else {
                    self.layerManager = new LayerManager(self.scene, self.camera, self.renderer, self.controls, self.$container);
                    self.layerManager.domEvent._isPLC = false;
                }

                self.layerManager.bindControlEvents();
                self.layerManager.rescaleMarkers();
                self.layerManager.renderList();
            });
        },

        initLights: function() {
            var ambient = new THREE.AmbientLight(0x101030);
            this.scene.add(ambient);

            this.addLightsToCamera();
        },

        addLightsToCamera: function() {
            var dirLight = new THREE.DirectionalLight(0xffffff);
            dirLight.position.set(200, 200, 1000).normalize();
            this.camera.add(dirLight);
            this.camera.add(dirLight.target);
        },

        initAxes: function() {
            var axes = new THREE.AxisHelper();
            axes.position.set(-1000, 0, 0);
            axes.scale.x = axes.scale.y = axes.scale.z = 2;
            this.scene.add(axes);

            var arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 50);
            arrow.position.set(200, 0, 400);
            this.scene.add(arrow);
        },

        initStats: function() {
            this.stats = new Stats();
            document.body.appendChild(this.stats.domElement);

            this.$stats = $(this.stats.domElement);
            this.$stats.attr('id','statsWin');
            this.$stats.attr('class', 'statsWinMaximized');

            this.$statsArrow = $("<i id=\"statsArrow\" class=\"icon-chevron-down\"></i>");
            this.$stats.prepend(this.$statsArrow);

            var that = this;
            this.$statsArrow.bind('click', function() {
                that.$stats.toggleClass('statsWinMinimized statsWinMaximized');
            });
        },

        initShortcuts: function() {
            var self = this;
            $('#shortcuts a').bind("click", function() {
                var cimv;

                switch (self.stateControl) {
                    case self.STATECONTROL.PLC:
                        cimv = new ControlsInfosModalView({isPLC:true, isTBC:false});
                        break;
                    case self.STATECONTROL.TBC:
                        cimv = new ControlsInfosModalView({isPLC:false, isTBC:true});
                        break;
                }

                $("body").append(cimv.render().el);
                cimv.openModal();
            });
        },

        initRenderer: function() {
            this.renderer = new THREE.WebGLRenderer();
            this.renderer.setSize(this.$container.width(), this.$container.height());
            this.$container.append(this.renderer.domElement);
        },

        loadWindowResize: function() {
            var windowResize = THREEx.WindowResize(this.renderer, this.camera, this.$container);
        },

        animate: function() {
            var self = this;
            window.requestAnimationFrame(function() {
                self.animate();
            });

            switch (this.stateControl) {
                case this.STATECONTROL.PLC:
                    this.cameraPosition = this.controls.getPosition();
                    this.controls.update(Date.now() - this.time);
                    this.time = Date.now();
                    break;
                case this.STATECONTROL.TBC:
                    this.cameraPosition = this.camera.position;
                    this.controls.update();
                    break;
            }

            this.render();

            this.stats.update();
        },

        render: function() {
            this.updateInstances();
            this.scene.updateMatrixWorld();
            this.renderer.render(this.scene, this.camera);
        },

        updateInstances: function() {

            var frustum = new THREE.Frustum();
            var projScreenMatrix = new THREE.Matrix4();
            projScreenMatrix.multiply(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            frustum.setFromMatrix(projScreenMatrix);

            var updateIndex = Math.min((this.updateOffset + this.updateCycleLength), this.instances.length);
            for (var j = this.updateOffset; j < updateIndex; j++) {
                this.instances[j].update(frustum);
            }
            if (updateIndex < this.instances.length) {
                this.updateOffset = updateIndex;
            } else {
                this.updateOffset = 0;
            }
        },

        addPartIteration: function(partIteration) {
            this.partIterations[partIteration.partIterationId] = partIteration;
        },

        getPartIteration: function(partIterationId) {
            return this.partIterations[partIterationId];
        },

        hasPartIteration: function(partIterationId) {
            return _.has(this.partIterations, partIterationId);
        },

        addInstanceOnScene: function(instance) {
            this.instancesMap[instance.id] = instance;
            sceneManager.instances.push(instance);
        },

        removeInstanceFromScene: function(instanceId) {
            var numbersOfInstances = sceneManager.instances.length;

            var index = null;

            for (var j = 0; j < numbersOfInstances; j++) {
                if (sceneManager.instances[j].id == instanceId) {
                    index = j;
                    break;
                }
            }

            if (index != null) {
                sceneManager.instances[j].clearMeshAndLevelGeometry();
                sceneManager.instances.splice(index, 1);
                delete this.instancesMap[instanceId];
            }
        },

        isOnScene: function(instanceId) {
            return _.has(this.instancesMap, instanceId);
        },

        setPathForIframe: function(pathForIframe) {
            this.pathForIframeLink = pathForIframe;
        },

        initIframeScene: function() {
            if (!_.isUndefined(SCENE_INIT.pathForIframe)) {
                var self = this;
                var instancesUrl = "/api/workspaces/" + APP_CONFIG.workspaceId + "/products/" + APP_CONFIG.productId + "/instances?configSpec=latest&path=" + SCENE_INIT.pathForIframe
                $.getJSON(instancesUrl, function(instances) {
                    _.each(instances, function(instanceRaw) {

                        //do something only if this instance is not on scene
                        if (!self.isOnScene(instanceRaw.id)) {

                            //if we deal with this partIteration for the fist time, we need to create it
                            if (!self.hasPartIteration(instanceRaw.partIterationId)) {
                                self.addPartIteration(new self.PartIteration(instanceRaw));
                            }

                            var partIteration = self.getPartIteration(instanceRaw.partIterationId);

                            //finally we create the instance and add it to the scene
                            self.addInstanceOnScene(new Instance(
                                instanceRaw.id,
                                partIteration,
                                instanceRaw.tx * 10,
                                instanceRaw.ty * 10,
                                instanceRaw.tz * 10,
                                instanceRaw.rx,
                                instanceRaw.ry,
                                instanceRaw.rz
                            ));
                        }

                    });
                });
            }
        },

        bind: function ( scope, fn ) {
            return function () {
                fn.apply( scope, arguments );
            }
        }
    }

    return SceneManager;
});