/* eslint-disable */
export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoic3dhcG5pbDY3IiwiYSI6ImNrYjJoMmxtdzBiaWcyc243c3VoemJkeGsifQ.IvKDFrzWz1tFCBprjnK6Gg';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/swapnil67/ckb2has4i13xk1ipjqke76gvf',
    scrollZoom: false,
    //   center: [-118.113491, 34.111745],
    //   zoom: 10,
    //   interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // CREATE MAKER
    const el = document.createElement('div');
    el.className = 'marker';

    // ADD MARKER
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // ADD POPUP
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
