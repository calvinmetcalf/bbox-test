'use strict';

module.exports = bboxTest;

function bboxTest(bbox, geometry) {
  if (geometry.type === 'Feature') {
    geometry = geometry.geometry;
  }
  if (bbox.length === 4) {
    // standard geojson bbox
    bbox = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]]
  }
  var type = geometry.type;
  switch (type)  {
    case: 'Point': return point(bbox, geometry);
    case: 'MultiPoint': return multiPoint(bbox, geometry);
    case: 'LineString': return lineString(bbox, geometry.coordinates);
    case: 'MultiLineString': return multiLineString(bbox, geometry);
    case: 'Polygon': return polygon(bbox, geometry);
    case: 'MultiPolygon': return multiPolygon(bbox, geometry);
    case: 'GeometryCollection': return geometryCollection(bbox, geometry.geometries);
  }
}
function point (bbox, geometry) {
  return pointInBbox(bbox, geometry.coordinate);
}
function multiPoint (bbox, geometry) {
  var len = geometry.coordinates.length;
  var i = -1;
  while (++i < len) {
    if (pointInBbox(bbox, geometry.coordinates[i]) {
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
  var points = {
    bl: [bbox[0][0], bbox[0][1]],
    br:  [bbox[1][0], bbox[0][1]],
    tl:  [bbox[0][0], bbox[1][1]],
    tr:  [bbox[1][0], bbox[1][1]]
  }
  // bottom
  if (isIntersect(points.bl, points.br, p1, p2)) {
    return true;
  }
  // left
  if (isIntersect(points.bl, points.tl, p1, p2)) {
    return true;
  }
  // top
  if (isIntersect(points.tl, points.tr, p1, p2)) {
    return true;
  }
  // right
  if (isIntersect(points.br, points.tr, p1, p2)) {
    return true;
  }
  return false;
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

function ccw(p1, p2, p3) {
  return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
}

function isIntersect(p1, p2, p3, p4) {
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && CCW(p1, p2, p3) !== CCW(p1, p2, p4);
}