const geojson = 'assets/hotspot.geojson'

// Mapbox token
const mapbox_token = 'pk.eyJ1IjoiaXZwcm9qZWN0IiwiYSI6ImNrcDZuOWltYzJyeGMycW1jNDVlbDQwejQifQ.97Y2eucdbVp1F2Ow8EHgBQ'

//YOUR TURN: add your Mapbox token
mapboxgl.accessToken = mapbox_token

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/dark-v10', // YOUR TURN: choose a style: https://docs.mapbox.com/api/maps/#styles
    center: [31.237400233484536, 88.7984904553465], // starting position [lng, lat]
});

map.addControl(new mapboxgl.NavigationControl(), 'top-left');

// geocoder/searchbar
var geocoder = new MapboxGeocoder({ // Initialize the geocoder
    accessToken: mapbox_token, // Set the access token
    mapboxgl: mapboxgl, // Set the mapbox-gl instance
});

// Add the geocoder to the map
map.addControl(geocoder);

let a = $.ajax({
    type: "GET",
    url: geojson,
    dataType: "json",
    success: function (csvData) {
        console.log('ok')
    }
}).done(data => {
    map.on('load', () => {
        map.addLayer({
            'id': 'hotspot',
            'type': 'circle',
            'source': {
                'type': 'geojson',
                'data': data
            },
            'paint': {
                'circle-color': {
                    property: 'frp',
                    stops: [
                        [0, '#ee9b00'],
                        [1.5, '#ca6702'],
                        [2, '#5a189a'],
                        [2.5, '#9b2226'],
                        [3, '#d00000'],
                    ]
                },
                'circle-radius': 3,
                'circle-stroke-width': 1,
                'circle-stroke-color': 'white',
                'circle-stroke-opacity': 1
            }
        });

        map.addLayer({
            id: 'query-radius',
            source: {
                type: 'geojson',
                data: {
                    "type": "FeatureCollection",
                    "features": []
                }
            },
            type: 'fill',
            paint: {
                'fill-color': '#F1CF65',
                'fill-opacity': 0.5
            }
        });

        map.addLayer({
            id: 'query-results',
            source: {
                type: 'geojson',
                data: {
                    "type": "FeatureCollection",
                    "features": []
                }
            },
            type: 'circle',
            'paint': {
                'circle-color': {
                    property: 'frp',
                    stops: [
                        [0, '#ee9b00'],
                        [1.5, '#ca6702'],
                        [2, '#5a189a'],
                        [2.5, '#9b2226'],
                        [3, '#d00000'],
                    ]
                },
                'circle-radius': 4,
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#00f5d4',
                'circle-stroke-opacity': 1
            }
        });

        geocoder.on('result', (e) => {
            let eventLngLat = e.result.geometry.coordinates
            let makeRadius = (lngLatArray, radiusInMiles) => {
                var point = turf.point(lngLatArray);
                var buffered = turf.buffer(point, radiusInMiles, {
                    units: 'miles'
                });
                return buffered;
            }

            let searchRadius = makeRadius(eventLngLat, 15);

            let source = map.getSource('query-radius')
            source.setData(searchRadius);

            UseBbox(source._data, 100)

            let spatialJoin = (sourceGeoJSON, filterFeature) => {
                let joined = sourceGeoJSON.features.filter(function (feature) {
                    return turf.booleanPointInPolygon(feature, filterFeature)
                });
                return joined;
            }

            let featuresInBuffer = spatialJoin(data, searchRadius);

            let result = map.getSource('query-results')
            result.setData(turf.featureCollection(featuresInBuffer));

            let list = document.getElementById('query-total')

            let newList = result._data.features.map(a => {
                let coor = a.geometry.coordinates.map(c => {
                    return c.toFixed(3)
                })

                let data = `
                            <li class="sidebar-dropdown">
                                <a>
                                    <i class="fa fa-map-marker"></i>
                                    <p class="query-res"><span class="small-date">${a.properties.acq_date}</span>
                                    <br>
                                    <span =id"latlng">Lat ${coor[0]} - Long ${coor[1]}</span>
                                    <input type="hidden" value=${coor[0]}>
                                    <input type="hidden" value=${coor[1]}>
                                    <br>
                                    <span class="detail-res"> Fire Radiative Power <span class="big-num">${a.properties.frp}Mw</span></p>
                                </a>
                            </li>
                            `

                return data
            })

            let newEl = document.createElement('ul')
            newEl.id = 'newData'
            let temptArray = null

            function delete_row(e) {
                e.parentElement.remove();
            }

            if (result._data.features.length !== 0) {
                document.getElementById('default').style.display = "none"
                newEl.innerHTML = newList.join(",").replaceAll(",", "")
                list.appendChild(newEl)
                document.getElementById('query-count').innerText = `${result._data.features.length}`
            } else {
                document.getElementById('newData').style.display = "none"
                document.getElementById('default').style.display = "block"
                document.getElementById('query-count').innerText = '0'
            }

            let removeList = list.querySelectorAll('ul')

            if (removeList.length > 3) {
                removeList[2].remove()
            }
            let u = list.querySelectorAll('li')
            let p = new mapboxgl.Popup()
            for (let i in u) {
                if (i > 1) {
                    let l = u[i]
                    l.addEventListener("mouseover", function (event) {
                        let c = event.target.querySelectorAll("input")
                        let lat = c[0].value
                        let long = c[1].value

                        let popup = p
                            .setLngLat([lat, long])
                            .setHTML(`<p>This is firespot</p>`)
                            .addTo(map);
                    })
                }
            }
        });

        let UseBbox = (geo, pad) => {
            let bbox = turf.bbox(geo);
            map.fitBounds(bbox, {
                padding: pad
            })
        }

        UseBbox(data, 50)

    });
})
