import {Face} from './Face.js';
import {pointToLineDistance, signedDistanceToPlane, removeVertexFromList} from './utils.js';

const DISTANCE_TOLERANCE = 1E-5;

class Quickhull3D {
    DIM_TO_AXIS = {
        0: 'x',
        1: 'y',
        2: 'z'
    }

    constructor() {
        this.vertexList = []; // List of BABYLON.Vector3 objects 
        this.claimed = [] // List of BABYLON.Vector3 objects
        this.unclaimed = [];
        this.horizon = [];
    }

    

    buildInitialSimplex() {
        // For the first two points, select the two who have the furthest one-dimensional distance
         
        // Store the min vertex in each dimension
        const minVertices = [
            new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE),
            new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE),
            new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)
        ];

        const maxVertices = [
            new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE),
            new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE),
            new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE),
        ];

        for (let v of this.vertexList) {
            // console.log('look at vector', v);
            for (let i = 0; i < 3; i++) {
                if (v[this.DIM_TO_AXIS[i]] < minVertices[i][this.DIM_TO_AXIS[i]]) {
                    minVertices[i] = v;
                }
                if (v[this.DIM_TO_AXIS[i]] > maxVertices[i][this.DIM_TO_AXIS[i]]) {
                    maxVertices[i] = v;
                }
            }    
        }

        let maxDistance = maxVertices[0].x - minVertices[0].x;
        let maxAxis = 0;
        for (let i = 1; i < 3; i++) {
            const distance = maxVertices[i][this.DIM_TO_AXIS[i]] - minVertices[i][this.DIM_TO_AXIS[i]];
            if (distance > maxDistance) {
                maxDistance = distance;
                maxAxis = i;
            }
        }

        // console.log('max distance', maxDistance);
        // console.log('max axis', maxAxis);

        const v1 = minVertices[maxAxis];
        const v2 = maxVertices[maxAxis];

        console.log('v1', v1);
        console.log('v2', v2);
        
        let maxDist = Number.MIN_VALUE;
        let maxVertex = null;
        // For the third vertex, choose the one with the max distance to the line formed by the first two
        for (let v of this.vertexList) {
            const distance = pointToLineDistance(v2, v1, v);
            if (distance > maxDist) { 
                maxDist = distance;
                maxVertex = v;
            }
        }

        // console.log('max dist', maxDist);
        const v3 = maxVertex;
        console.log('v3', v3);

        // For the fourth vertex, choose the one with the max distance to the plane formed by the first three
        maxDist = Number.MIN_VALUE;
        maxVertex = null;
        for (let v of this.vertexList) {
            const distance = Math.abs(signedDistanceToPlane(v1, v2, v3, v));
            if (distance > maxDist) {
                maxDist = distance;
                maxVertex = v;
            }
        }

        // console.log('max dist', maxDist);
        const v4 = maxVertex;
        console.log('v4', v4);

        // Check if v4 is in front of the plane v1v2v3 or behind
        const signedDist = signedDistanceToPlane(v1, v2, v3, v4);
        const v4InFront = signedDist > 0;

        // Create faces from points
        const faces = [null, null, null, null];

        for (let i = 0; i < 4; i++) {
            faces[i] = new Face();
        }

        if (v4InFront) {
            faces[0].buildFromPoints(v3, v2, v1);
            faces[1].buildFromPoints(v2, v3, v4);
            faces[2].buildFromPoints(v4, v3, v1);
            faces[3].buildFromPoints(v1, v2, v4);
        } else {
            faces[0].buildFromPoints(v1, v2, v3);
            faces[1].buildFromPoints(v4, v3, v2);
            faces[2].buildFromPoints(v1, v3, v4);
            faces[3].buildFromPoints(v4, v2, v1);
        }

        console.log('initial faces', faces);

        // Connect faces, forming the initial polygon
        faces[0].findEdgeWithExtremities(v1, v2).setTwin(faces[3].findEdgeWithExtremities(v1, v2));
        faces[0].findEdgeWithExtremities(v2, v3).setTwin(faces[1].findEdgeWithExtremities(v2, v3));
        faces[0].findEdgeWithExtremities(v1, v3).setTwin(faces[2].findEdgeWithExtremities(v1, v3));

        faces[1].findEdgeWithExtremities(v3, v4).setTwin(faces[2].findEdgeWithExtremities(v3, v4));
        faces[1].findEdgeWithExtremities(v2, v4).setTwin(faces[3].findEdgeWithExtremities(v2, v4));

        faces[2].findEdgeWithExtremities(v1, v4).setTwin(faces[3].findEdgeWithExtremities(v1, v4));
        
        console.log('initial polygon', faces);

        // Go through the points again and check the distance to each one of the 
        // individual faces
        for (let v of this.vertexList) {
            if (v.equalsWithEpsilon(v1) || v.equalsWithEpsilon(v2) || v.equalsWithEpsilon(v3) || v.equalsWithEpsilon(v4)) {
                continue;
            }
            // console.log('for point', v);
            let maxDist = DISTANCE_TOLERANCE;
            let maxDistFace = null;
            for (let i = 0; i < 4; i++) {
                // const dist = Math.abs(faces[i].signedDistanceFromPoint(v));
                const dist = faces[i].signedDistanceFromPoint(v);
                // console.log('dist to face is', dist);
                if (dist > maxDist) {
                    maxDist = dist;
                    maxDistFace = faces[i];
                }
            }
            
            if (maxDistFace !== null) {
                this.addPointToFace(v, maxDistFace);
            }
        }

        console.log('claimed list', this.claimed);
    }

    // Adds point v to the outside list of f
    addPointToFace(v, f) {
        v.face = f; // Associate this vertex as being "outside" of this face
        if (f.hasEmptyOutsideSet()) {
            this.claimed.push(v);
        }
        f.outside.push(v); 
    }

    nextPointToAdd() {
        if (this.claimed.length > 0) {
            let eyeFace = this.claimed[0].face;
            let eyeVertex = null;

            let maxDist = 0;
            for (let vertex of eyeFace.outside) {
                const dist = eyeFace.signedDistanceFromPoint(vertex);
                if (dist > maxDist) {
                    maxDist = dist;
                    eyeVertex = vertex;
                }
            }

            return eyeVertex;
        } else {
            return null;
        }
    }

    addPointToHull(eye) {
        this.horizon = [];
        this.unclaimed = [];

        this.removePointFromFace(eye, eye.face);
        this.calculateHorizon(eye, null, eye.face, this.horizon);
    }

    removePointFromFace(v, f) {
        f.removeVertexFromOutsideSet(v);
        console.log('f and v after removal', f, v);
        removeVertexFromList(this.claimed, v);
    }

    calculateHorizon(eye, edge0, face, horizon) {

    }

    reindexFacesAndVertices() {

    }

    build(inputPoints) {
        console.log('got vertices', inputPoints);
        // console.log('v', inputPoints[0][this.DIM_TO_AXIS[0]]);
        this.vertexList = [...inputPoints]; 
        console.log('vertex list', this.vertexList);
        this.buildInitialSimplex();

        let cnt = 0;
        let eye = this.nextPointToAdd();
        while (eye != null) {
            console.log('check eye', eye);
            this.addPointToHull(eye);
            cnt += 1;
            eye = this.nextPointToAdd();
            break;
        }
        this.reindexFacesAndVertices();
        console.log('finished convex hull');
    }

    // Returns a Babylon mesh for the convex hull
    render() {
        const mesh = new BABYLON.Mesh("mesh");
        const vertexData = new BABYLON.VertexData();


    }
}

export {Quickhull3D};