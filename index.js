'use strict';

module.exports = bboxTest;

function bboxTest(bbox, geometry) {
  if (geometry.type === 'Feature') {
    geometry = geometry.geometry;
  }
  if (bbox.length === 4) {
    // standard geojson bbox
    bbox = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
  }
  var type = geometry.type;
  switch (type)  {
    case 'Point': return point(bbox, geometry);
    case 'MultiPoint': return multiPoint(bbox, geometry);
    case 'LineString': return lineString(bbox, geometry.coordinates);
    case 'MultiLineString': return multiLineString(bbox, geometry);
    case 'Polygon': return polygon(bbox, geometry);
    case 'MultiPolygon': return multiPolygon(bbox, geometry);
    case 'GeometryCollection': return geometryCollection(bbox, geometry.geometries);
  }
}
function point (bbox, geometry) {
  return pointInBbox(bbox, geometry.coordinate);
}
function multiPoint (bbox, geometry) {
  var len = geometry.coordinates.length;
  var i = -1;
  while (++i < len) {
    if (pointInBbox(bbox, geometry.coordinates[i])) {
      return true;
    }
  }
  return false;
}
function lineString (bbox, coordinates) {
  var len = coordinates.length;
  var i = 0;
  var prev = coordinates[0];
  if (pointInBbox(bbox, prev)) {
    return true;
  }
  var cur;
  while (++i < len) {
    cur = coordinates[i];
    if (pointInBbox(bbox, cur)) {
      return true;
    }
    if (intersectsBbox(bbox, cur, prev)) {
      return true;
    }
    prev = cur;
  }
  return false;
}
function multiLineString(bbox, geometry) {
  var i = -1;
  var len = geometry.coordinates.length;
  while (++i < len) {
    if (lineString(bbox, geometry.coordinates[i])) {
      return true;
    }
  }
  return false;
}
function polygon (bbox, rings) {
  var coordinates = rings[0];
  var intersect = ring(bbox, coordinates);
  if (intersect !== 'maybe') {
    return intersect;
  }
  var len = rings.length;
  if (len === 1) {
    // no interior rings
    return true;
  }
  var i = 0, ringInter;
  while (++i < len) {
    ringInter = ring(bbox, rings[i]);
    if (ringInter === 'maybe') {
      // we are inside an interior ring
      return false;
    } else if (ringInter) {
      // we cross the boundry
      // and thus are thus partially inside main poly
      return true;
    }
  }
  return true;
}
function ring(bbox, coordinates) {
  var len = coordinates.length;
  var i = 0;
  var prev = coordinates[0];
  if (pointInBbox(bbox, prev)) {
    return true;
  }
  var cur;
  while (++i < len) {
    cur = coordinates[i];
    if (pointInBbox(bbox, cur)) {
      return true;
    }
    if (intersectsBbox(bbox, cur, prev)) {
      return true;
    }
    prev = cur;
  }
  // if none of the points in the ring are inside the bbox
  // and none of the lines cross it
  // then either all of the bbox points are inside it
  // or none are, so just test one
  if (pointInPolygon(bbox[0], coordinates)) {
    return 'maybe';
  } else {
    return false;
  }
}
function multiPolygon(bbox, geometry) {
  var i = -1;
  var len = geometry.coordinates.length;
  while (++i < len) {
    if (polygon(bbox, geometry.coordinates[i])) {
      return true;
    }
  }
  return false;
}
function geometryCollection (bbox, geometries) {
  var i = -1;
  var len = geometries.length;
  while (++i < len) {
    if (bboxTest(bbox, geometries[i])) {
      return true;
    }
  }
  return false;
}

function intersectsBbox(bbox, p1, p2) {
  var len = Math.min(bbox[0].length, bbox[1].length, p1.length, p2.length);
  var dirfrac = new Array(len);
  var i = -1;
  while (++i < len) {
    dirfrac[i] = 1/p2[i];
  }
  var maxes = new Array(len);
  var tmin = -Infinity;
  var tmax = Infinity;
  var mins = new Array(len);
  i = -1;
  var t1, t2, max, min;
  while (++i < len) {
    t1 = (bbox[0][i] - p1[i]) * dirfrac[i];
    t2 = (bbox[1][i] - p1[i]) * dirfrac[i];
    if (t1 >= t2) {
      max = t1;
      min = t2;
    } else if (t1 < t2) {
      max = t2;
      min = t1;
    }
    if (min > tmin) {
      tmin = min;
    }
    if (max < tmax) {
      tmax = max;
    }
  }
  if (tmax < 0 || tmin > tmax) {
    return false;
  }
  return true;
}
function pointInBbox(bbox, point) {
  var len = Math.min(bbox[0].length, bbox[1].length, point.length);
  var i = -1;
  while (++i < len) {
    if (point[i] < bbox[0][i] || point[i] > bbox[1][i]) {
      return false;
    }
  }
  return true;
}
function pointInPolygon(point, polygon) {
    // based on https://github.com/substack/point-in-polygon/blob/master/index.js
    //which is based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    // basically we do the point in polygon, but break it down into multiple checks
    // each with 2 dimentions
    var i = -1;
    var len = polygon.length;
    var inside = [];
    var j = len -1;
    var plen = point.length;
    var jp, ip, k, l, intersect, clen;
    while (++i < len) {
      ip = polygon[i];
      jp = polygon[j];
      plen = Math.min(ip.length, jp.length, plen);
      clen = plen - 1;
      l = -1;
      k = clen;
      if (plen === 2) {
        // special case
        // would just be xy and yx
        // but when we are at 3 its
        // xy, yz, and zx and thus does matter
        plen = 1;
      }
      while (++l < plen) {
        intersect = ((ip[l] > point[l]) !== (jp[l] > point[l])) &&
            (point[k] < (jp[k] - ip[k]) * (point[l] - ip[l]) / (jp[l] - ip[l]) + ip[k]);
        if (intersect) {
          inside[k] = !inside[k];
        }
        k = l;
      }
      j = i;
    }
    i = -1;
    while (++i < clen) {
      if (!inside[i]) {
        return false;
      }
    }
    return true;
}