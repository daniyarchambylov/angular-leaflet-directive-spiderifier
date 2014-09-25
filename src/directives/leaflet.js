angular.module("leaflet-directive", []).directive('leaflet', function ($q, leafletData, leafletMapDefaults, leafletHelpers, leafletEvents) {
    var _leafletMap,
        _spiderfier,
        spiderfierPluginIsLoaded = leafletHelpers.OverlappingMarkerSpiderfierPlugin.isLoaded();
    return {
        restrict: "EA",
        replace: true,
        scope: {
            center         : '=center',
            defaults       : '=defaults',
            maxbounds      : '=maxbounds',
            bounds         : '=bounds',
            markers        : '=markers',
            legend         : '=legend',
            geojson        : '=geojson',
            paths          : '=paths',
            tiles          : '=tiles',
            layers         : '=layers',
            controls       : '=controls',
            decorations    : '=decorations',
            eventBroadcast : '=eventBroadcast',
            spiderfier     : '=spiderfier'
        },
        transclude: true,
        template: '<div class="angular-leaflet-map"><div ng-transclude></div></div>',
        controller: function ($scope) {
            _leafletMap = $q.defer();

            if(spiderfierPluginIsLoaded){
                _spiderfier = $q.defer();
            }

            this.getMap = function () {
                return _leafletMap.promise;
            };

            this.getOMSMap = function() {
                return spiderfierPluginIsLoaded ? _spiderfier.promise : null;
            };

            this.getLeafletScope = function() {
                return $scope;
            };
        },

        link: function(scope, element, attrs) {
            var isDefined = leafletHelpers.isDefined,
                defaults = leafletMapDefaults.setDefaults(scope.defaults, attrs.id),
                genDispatchMapEvent = leafletEvents.genDispatchMapEvent,
                mapEvents = leafletEvents.getAvailableMapEvents();

            // Set width and height if they are defined
            if (isDefined(attrs.width)) {
                if (isNaN(attrs.width)) {
                    element.css('width', attrs.width);
                } else {
                    element.css('width', attrs.width + 'px');
                }
            }
            if (isDefined(attrs.height)) {
                if (isNaN(attrs.height)) {
                    element.css('height', attrs.height);
                } else {
                    element.css('height', attrs.height + 'px');
                }
            }

            // Create the Leaflet Map Object with the options
            var map = new L.Map(element[0], leafletMapDefaults.getMapCreationDefaults(attrs.id));
            _leafletMap.resolve(map);

            if(spiderfierPluginIsLoaded){
                var oms = new OverlappingMarkerSpiderfier(map, angular.extend({}, attrs.spiderfier || {}));
                oms.addListener('click', function(marker) {
                    scope.$emit('marker:clicked', {
                        icon: marker.options.icon.options.icon,
                        color: marker.options.icon.options.markerColor,
                        name: marker.name
                    });
                });
                _spiderfier.resolve(oms);
            }

            if (!isDefined(attrs.center)) {
                map.setView([defaults.center.lat, defaults.center.lng], defaults.center.zoom);
            }

            // If no layers nor tiles defined, set the default tileLayer
            if (!isDefined(attrs.tiles) && (!isDefined(attrs.layers))) {
                var tileLayerObj = L.tileLayer(defaults.tileLayer, defaults.tileLayerOptions);
                tileLayerObj.addTo(map);
                leafletData.setTiles(tileLayerObj, attrs.id);
            }

            // Set zoom control configuration
            if (isDefined(map.zoomControl) &&
                isDefined(defaults.zoomControlPosition)) {
                map.zoomControl.setPosition(defaults.zoomControlPosition);
            }

            if (isDefined(map.zoomControl) &&
                defaults.zoomControl===false) {
                map.zoomControl.removeFrom(map);
            }

            if (isDefined(map.zoomsliderControl) &&
                isDefined(defaults.zoomsliderControl) &&
                defaults.zoomsliderControl===false) {
                map.zoomsliderControl.removeFrom(map);
            }


            // if no event-broadcast attribute, all events are broadcasted
            if (!isDefined(attrs.eventBroadcast)) {
                var logic = "broadcast";
                for (var i = 0; i < mapEvents.length; i++) {
                    var eventName = mapEvents[i];
                    map.on(eventName, genDispatchMapEvent(scope, eventName, logic), {
                        eventName: eventName
                    });
                }
            }

            // Resolve the map object to the promises
            map.whenReady(function() {
                leafletData.setMap(map, attrs.id);
            });

            scope.$on('$destroy', function () {
                leafletData.getMap().then(function(map) {
                    map.remove();
                });
                leafletData.unresolveMap(attrs.id);
            });
        }
    };
});
