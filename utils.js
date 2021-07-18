// Returns the distance from point p to the line defined by b-a
// From: https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
function pointToLineDistance(a, b, p) {
    // console.log('point to line distance from', p, 'to line', a, b);
    const direction = b.subtract(a);
    //direction.normalize();

    const aMinusP = p.subtract(a);
    return aMinusP.cross(direction).length() / direction.length();
}

function signedDistanceToPlane(a, b, c, p) {
    const normal = b.subtract(a).cross(c.subtract(a));
    normal.normalize();

    return BABYLON.Vector3.Dot(normal, p.subtract(a));
}

function signedArea(a, b, c) {
    // console.log('compute signed area for', a, b, c);
    const o = a.add(b).add(c).scale(1/3);
    console.log('o', o);
    const oa = a.subtract(o);
    const ob = b.subtract(o);
    const oc = c.subtract(o);
    // console.log('oa ob oc', oa, ob, oc);
    console.log(oa.cross(ob));
    console.log(oa.cross(ob).add(ob.cross(oc)));
    console.log(oa.cross(ob).add(ob.cross(oc)).add(oc.cross(oa)));
    const S = oa.cross(ob).add(ob.cross(oc)).add(oc.cross(oa)).scale(1/2);
    // console.log('S', S);
    // return b.subtract(a).cross(c.subtract(b));
    return S;
}

function removeVertexFromList(remove, list) {
    let idxToRemove = -1;
    for (let i = 0; i < list.length; i++) {
        const outsideVert = list[i];
        if (outsideVert.equalsWithEpsilon(remove)) {
            idxToRemove = i;
            break;
        }
    }
    list.splice(idxToRemove, 1);
}

export {pointToLineDistance, signedDistanceToPlane, signedArea, removeVertexFromList};