import {HalfEdge} from './HalfEdge.js';
import {signedArea, signedDistanceToPlane, removeVertexFromList} from './utils.js'

let ID_COUNTER = 0;

const FaceTypes = {
    VISIBLE: 0,
    NON_CONVEX: 1,
    DELETED: 2,
}

class Face {

    constructor(step) {
        this.normal = BABYLON.Vector3();
        this.centroid = BABYLON.Vector3();
        this.mark = FaceTypes.VISIBLE;
        this.points = [null, null, null];
        this.halfEdges = [null, null, null];
        this.outside = []; // Set of vertices that are outside (not coplanar) this face
        this.createdAt = step; // The step at where this face was created
        // console.log('created face at step', this.mark);
        this.id = ID_COUNTER++;
    }

    // Check if the face is the same as another face, with its points on the same orientation
    equalsSameOrientation(other) {
        for (let i = 0; i < 3; i++) {
            const ownPt = this.points[i];
            const otherPt = other.points[i];

            if (!ownPt.equalsWithEpsilon(otherPt)) {
                return false;
            }
        }
        return true;
    }

    // Check if the face is the same as another face, with its points on the opposite orientation 
    equalsOppositeOrientation(other) {
        for (let i = 0; i < 3; i++) {
            const ownPt = this.points[i];
            const otherPt = other.points[2-i];

            if (!ownPt.equalsWithEpsilon(otherPt)) {
                return false;
            }
        }
        return true;
    }

    hasEmptyOutsideSet() {
        return this.outside.length === 0;
    }

    markAsDeleted(step) {
        this.mark = FaceTypes.DELETED;
        this.deletedAt = step;
    }

    removeVertexFromOutsideSet(remove) {
        removeVertexFromList(remove, this.outside);
    }

    getNeighborFaceIds() {
        const n = [];
        for (let he of this.halfEdges) {
            n.push(he.oppositeFace().id);
        }
        return n;
    }

    printNeighborFaceInfo() {
        console.log(`Face ${this.id} has neighbors ${this.getNeighborFaceIds()}`);
    }

    buildFromPointAndHalfEdge(p, he) {
        this.points = [p, he.tail(), he.head()];

        this.normal = signedArea(this.points[0], this.points[1], this.points[2]);
        this.normal.normalize();

        this.halfEdges = [null, null, null];
        this.halfEdges[0] = new HalfEdge(p, this);
        this.halfEdges[1] = new HalfEdge(he.tail(), this);
        this.halfEdges[2] = he;

        he.face = this;

        for (let i = 0; i < 2; i++) {
            this.halfEdges[i].next = this.halfEdges[i+1];
        }
        this.halfEdges[2].next = this.halfEdges[0];

        for (let i = 1; i < 3; i++) {
            this.halfEdges[i].prev = this.halfEdges[i-1];
        }
        this.halfEdges[0].prev = this.halfEdges[2];
    }

    centroid() {
        let acc = new BABYLON.Vector3();
        for (let he of this.halfEdges) {
            acc.add(he.head());
        }

        return acc.scale(1/this.halfEdges.length);
    }

    buildFromPoints(a, b, c) {
        // console.log('building face from points', a, b, c);
        
        this.points = [a, b, c];
        this.normal = signedArea(a, b, c);
        this.normal.normalize();

        // Create a half-edge for each point
        for (let i = 0; i < 3; i++) {
            this.halfEdges[i] = new HalfEdge(this.points[i], this);
        }
        
        for (let i = 0; i < 2; i++) {
            this.halfEdges[i].next = this.halfEdges[i+1];
        }
        this.halfEdges[2].next = this.halfEdges[0];

        for (let i = 1; i < 3; i++) {
            this.halfEdges[i].prev = this.halfEdges[i-1];
        }
        this.halfEdges[0].prev = this.halfEdges[2];

    }

    findEdgeWithExtremities(a, b) {
        for (let i = 0; i < this.halfEdges.length; i++) {
            const halfEdge = this.halfEdges[i];
            const equalsAB = halfEdge.head().equalsWithEpsilon(a) && halfEdge.tail().equalsWithEpsilon(b);
            const equalsBA = halfEdge.head().equalsWithEpsilon(b) && halfEdge.tail().equalsWithEpsilon(a);

            if (equalsAB || equalsBA) {
                return halfEdge;
            }
        }

        return null;
    }

    signedDistanceFromPoint(p) {
        return signedDistanceToPlane(this.points[0], this.points[1], this.points[2], p);
    }

    // check if point p is visible from face
    isVisible(p) {
        // console.log('check if', p, 'is visible');
        const p1 = this.points[0];
        const p2 = this.points[1];
        const p3 = this.points[2];
        // triangle centroid
        const c = p1.add(p2).add(p3).scale(0.333);
        console.log('c', c);

        // line from centroid to point p
        const cp = p.subtract(c);
        cp.normalizeToRef(cp);
        console.log('cp', cp);

        // triangle normal
        const p1p2 = p2.subtract(p1);
        const p3p1 = p3.subtract(p1);

        const n = BABYLON.Vector3.Cross(p1p2, p3p1);
        n.normalizeToRef(n);
        console.log('n', n);

        const angle = BABYLON.Vector3.Dot(cp, n);
        console.log('angle cos', angle);
        return angle > 0;
    }

    GetInterval(triangle, axis) {
        let result = {};
    
        result.min = BABYLON.Vector3.Dot(axis, triangle.points[0]);
        result.max = result.min;
        for (let i = 1; i < 3; i++) {
            let value = BABYLON.Vector3.Dot(axis, triangle.points[i]);
            result.min = Math.min(result.min, value);
            result.max = Math.max(result.max, value);
        }
    
        return result;
    }

    OverlapOnAxis(t1, t2, axis) {
        let a = this.GetInterval(t1, axis);
        let b = this.GetInterval(t2, axis);
        return ((b.min <= a.max) && (a.min <= b.max));
    }

    // Checks if this face intersects other face
    // intersects(other) {
    //     const t1_f0 = this.halfEdges[0].vector();
    //     const t1_f1 = this.halfEdges[1].vector();
    //     const t1_f2 = this.halfEdges[2].vector();

    //     const t2_f0 = other.halfEdges[0].vector();
    //     const t2_f1 = other.halfEdges[1].vector();
    //     const t2_f2 = other.halfEdges[2].vector();

    //     const axesToTest = [
    //         // Triangle 1, Normal
    //         BABYLON.Vector3.Cross(t1_f0, t1_f1),
    //         // Triangle 2, Normal
    //         BABYLON.Vector3.Cross(t2_f0, t2_f1),

    //         // Cross Product of edges
    //         BABYLON.Vector3.Cross(t2_f0, t1_f0),
    //         BABYLON.Vector3.Cross(t2_f0, t1_f1),
    //         BABYLON.Vector3.Cross(t2_f0, t1_f2),

    //         BABYLON.Vector3.Cross(t2_f1, t1_f0),
    //         BABYLON.Vector3.Cross(t2_f1, t1_f1),
    //         BABYLON.Vector3.Cross(t2_f1, t1_f2),

    //         BABYLON.Vector3.Cross(t2_f2, t1_f0),
    //         BABYLON.Vector3.Cross(t2_f2, t1_f1),
    //         BABYLON.Vector3.Cross(t2_f2, t1_f2),
    //     ];

    //     for (let i = 0; i < 11; i++) {
    //         if (!this.OverlapOnAxis(this, other, axesToTest[i])) {
    //             return false; // Seperating axis found
    //         }
    //     }
    
    //     return true; // Seperating axis not found
    // }
    intersects(other) {
        for (let i = 0; i < 3; i++) {
            const thisp = this.points[i];
            // Direction is the edge with tail equal as the point
            const thisdir = this.halfEdges[(i+1)%3].vector();
            const thisray = new BABYLON.Ray(thisp, thisdir, thisdir.length());

            const thisintersection = thisray.intersectsTriangle(other.points[0], other.points[1], other.points[2]);
            if (thisintersection && thisintersection.distance > 0 && thisintersection.distance < 1) {
                // console.log('ray', thisray, 'intersects face', other);
                return true;
            }

            const otherp = other.points[i];
            // Direction is the edge with tail equal as the point
            const otherdir = other.halfEdges[(i+1)%3].vector();
            const otherray = new BABYLON.Ray(otherp, otherdir, otherdir.length());

            const otherintersection = otherray.intersectsTriangle(this.points[0], this.points[1], this.points[2]);
            if (otherintersection && otherintersection.distance > 0 && otherintersection.distance < 1) {
                // console.log('ray', otherray, 'intersects face', this);
                return true;
            }
        }

        return false;
    }
}

export {Face, FaceTypes};