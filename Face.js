import {HalfEdge} from './HalfEdge.js';
import {signedArea, signedDistanceToPlane, removeVertexFromList} from './utils.js'

const FaceTypes = {
    VISIBLE: 0,
    NON_CONVEX: 1,
    DELETED: 2,
}

class Face {


    constructor(step) {
        this.normal = BABYLON.Vector3();
        // this.centroid = BABYLON.Vector3();
        this.mark = FaceTypes.VISIBLE;
        this.points = [null, null, null];
        this.halfEdges = [null, null, null];
        this.outside = []; // Set of vertices that are outside (not coplanar) this face
        this.createdAt = step; // The step at where this face was created
        // console.log('created face at step', this.mark);
    }

    hasEmptyOutsideSet() {
        return this.outside.length === 0;
    }

    markAsDeleted(step) {
        this.mark = FaceTypes.DELETED;
        this.deletedAt = step;
    }

    removeVertexFromOutsideSet(remove) {
        // let idxToRemove = -1;
        // for (let i = 0; i < this.outside.length; i++) {
        //     const outsideVert = this.outside[i];
        //     if (outsideVert.equalsWithEpsilon(remove)) {
        //         idxToRemove = i;
        //         break;
        //     }
        // }
        // this.outside.splice(idxToRemove, 1);
        removeVertexFromList(remove, this.outside);
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
        for (let i = 0; i < 3; i++) {
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
}

export {Face, FaceTypes};