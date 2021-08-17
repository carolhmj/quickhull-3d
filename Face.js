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
    equalsWithOrientation(other) {
        for (let i = 0; i < 3; i++) {
            const ownPt = this.points[i];
            const otherPt = other.points[i];

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

    normal() {
        let he0 = this.halfEdges[0];
        let he1 = he.next;
        let he2 = he1.next;

        let p0 = he0.head();
        let p2 = he1.head();

        let d2x = p2.x - p0.x;
        let d2y = p2.y - p0.y;
        let d2z = p2.z - p0.z;

        let normal = new BABYLON.Vector3();

        
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
        console.log('check if', p, 'is visible');
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
}

export {Face, FaceTypes};