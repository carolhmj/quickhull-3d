import {Face, FaceTypes} from './Face.js';
import {pointToLineDistance, signedDistanceToPlane, removeVertexFromList} from './utils.js';
import { CONSTS } from './consts.js';

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
        this.newFaces = [];
        this.faces = [];
        this.renderableMesh = new BABYLON.Mesh("convex-hull");
    }

    

    buildInitialSimplex(step) {
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
            faces[i] = new Face(step);
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

        // console.log('initial faces', faces);

        // Connect faces, forming the initial polygon
        faces[0].findEdgeWithExtremities(v1, v2).setTwin(faces[3].findEdgeWithExtremities(v1, v2));
        faces[0].findEdgeWithExtremities(v2, v3).setTwin(faces[1].findEdgeWithExtremities(v2, v3));
        faces[0].findEdgeWithExtremities(v1, v3).setTwin(faces[2].findEdgeWithExtremities(v1, v3));

        faces[1].findEdgeWithExtremities(v3, v4).setTwin(faces[2].findEdgeWithExtremities(v3, v4));
        faces[1].findEdgeWithExtremities(v2, v4).setTwin(faces[3].findEdgeWithExtremities(v2, v4));

        faces[2].findEdgeWithExtremities(v1, v4).setTwin(faces[3].findEdgeWithExtremities(v1, v4));
        
        // console.log('initial polygon', faces);

        this.faces.push(...faces);

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
                // console.log('add point', v, 'to face', maxDistFace);
                this.addPointToFace(v, maxDistFace);
            }
        }

        // console.log('claimed list', this.claimed);
    }

    // Adds point v to the outside list of f
    addPointToFace(v, f) {
        v.face = f; // Associate this vertex as being "outside" of this face
        // if (f.hasEmptyOutsideSet()) {
        //     console.log('add point', v, 'to claimed list');
        //     this.claimed.push(v);
        // }
        
        console.log('add point', v, 'to claimed list');
        this.claimed.push(v);
        f.outside.push(v); 
    }

    nextPointToAdd() {
        // console.log('on nextPointToAdd. claimed list is', this.claimed);
        if (this.claimed.length > 0) {
            let eyeFace = this.claimed[0].face;
            // console.log('eyeFace', eyeFace);
            let eyeVertex = null;

            let maxDist = 0;
            for (let vertex of eyeFace.outside) {
                const dist = eyeFace.signedDistanceFromPoint(vertex);
                if (dist > maxDist) {
                    maxDist = dist;
                    eyeVertex = vertex;
                }
            }
            // console.log('eyeVertex', eyeVertex);
            return eyeVertex;
        } else {
            return null;
        }
    }

    addPointToHull(eye, step) {
        console.log('adding eye point', eye, 'to hull');
        this.horizon = [];
        this.unclaimed = [];

        this.removePointFromFace(eye, eye.face);
        this.calculateHorizon(eye, null, eye.face, this.horizon, step);
        console.log('horizon', this.horizon);
        console.log('unclaimed after horizon');
        for (let v of this.unclaimed) {
            console.log('v', v);
        }
        // this.newFaces = []; 
        this.addNewFaces(this.newFaces, eye, this.horizon, step);

        // Can do merge pass here, leave for later
        // ...

        this.resolveUnclaimedPoints(this.newFaces);
    }

    resolveUnclaimedPoints(newFaces) {
        console.log('on resolveUnclaimedPoints, unclaimed list is', this.unclaimed);
        for (let unclaimedVert of this.unclaimed) {
            console.log('look at unclaimed vert', unclaimedVert);
            let maxDist = DISTANCE_TOLERANCE;
            let maxFace = null;

            for (let f of newFaces) {
                if (f.mark === FaceTypes.VISIBLE) {
                    const dist = f.signedDistanceFromPoint(unclaimedVert);
                    console.log('dist to new face', f, dist);
                    if (dist > maxDist) {
                        maxDist = dist;
                        maxFace = f;
                    }
                    // Not sure why this is needed, remove it?
                    // if (maxDist > 1000*DISTANCE_TOLERANCE) {
                    //     break;
                    // }
                }
            }

            if (maxFace !== null) {
                this.addPointToFace(v, maxFace);
            }
        }
    }

    addNewFaces(newFaces, eye, horizon, step) {
        // this.newFaces = [];
        newFaces = [];
        let edgePrev = null;
        let edgeBegin = null;
        
        for (let hedge of horizon) {
            console.log('look at hedge', hedge, 'of horizon');
            // let horizonHe = hedge.next;
            // console.log('its next edge is', horizonHe);
            // let hedgeSide = this.addAdjoiningFace(eye, horizonHe, step);
            let hedgeSide = this.addAdjoiningFace(eye, hedge, step);
            console.log('new face:', hedgeSide.face, 'with points', hedgeSide.face.points);
            // if (edgePrev != null) {
                // hedgeSide.next.setTwin(edgePrev);
                // horizonHe.prev.setTwin(edgePrev);
            // } else {
                // edgeBegin = hedgeSide;
            // }

            newFaces.push(hedgeSide.face);
            // edgePrev = hedgeSide;
        }

        // edgeBegin.next.setTwin(edgePrev);
    }

    addAdjoiningFace(eye, edge, step) {
        const face = new Face(step);
        face.buildFromPoints(eye, edge.tail(), edge.head());
        this.faces.push(face);
        // face.halfEdges[2].setTwin(edge.twin);
        face.halfEdges[1].setTwin(edge.twin);
        // return face.halfEdges[0];
    }

    removePointFromFace(v, f) {
        console.log('removing point', v, 'from face', f);
        f.removeVertexFromOutsideSet(v);
        removeVertexFromList(v, this.claimed);
        // console.log('f and v after removal', f, v);
    }

    removeAllPointsFromFace(f) {
        let removedPts = [...f.outside];
        for (let v of f.outside) {
            this.removePointFromFace(v, f);
        }
        return removedPts;
    }

    calculateHorizon(eye, edge0, face, horizon, step) {
        this.deleteFacePoints(face, null);
        // face.mark = FaceTypes.DELETED;
        face.markAsDeleted(step);
        console.log('visiting face', face, 'deleted');
        let edge = null;
        if (edge0 === null) {
            edge0 = face.halfEdges[0];
            edge = edge0;
        } else {
            edge = edge0.next;
        }
        do {
            let oppositeFace = edge.oppositeFace();
            if (oppositeFace.mark === FaceTypes.VISIBLE) {
                if (oppositeFace.signedDistanceFromPoint(eye) > DISTANCE_TOLERANCE) {
                    this.calculateHorizon(eye, edge.twin, oppositeFace, horizon, step);
                } else {
                    horizon.push(edge);
                    console.log('adding horizon edge', edge);
                }
            }
            edge = edge.next;
        } while (edge !== edge0); // reference comparison, is that safe enough?
    }

    deleteFacePoints(face, absorbingFace) {
        let faceVerts = this.removeAllPointsFromFace(face);
        if (faceVerts != null) {
            if (absorbingFace == null) {
                this.unclaimed.push(...faceVerts);
            } else {
                for (let v of faceVerts) {
                    const dist = absorbingFace.signedDistanceFromPoint(v);
                    if (dist > DISTANCE_TOLERANCE) {
                        this.addPointToFace(v, absorbingFace);
                    } else {
                        this.unclaimed.push(v);
                    }
                }
            }
        }
    }

    reindexFacesAndVertices() {

    }

    build(inputPoints) {
        let step = 0;
        console.log('got vertices', inputPoints);
        // console.log('v', inputPoints[0][this.DIM_TO_AXIS[0]]);
        this.vertexList = [...inputPoints]; 
        console.log('vertex list', this.vertexList);
        this.buildInitialSimplex(step);
        step += 1;

        let eye = this.nextPointToAdd();
        while (eye != null) {
            console.log('============ STEP', step, '===============');
            console.log('check eye', eye, 'at step', step);
            this.addPointToHull(eye, step);
            step += 1;
            eye = this.nextPointToAdd();
            // break;
        }
        this.totalSteps = step;
        this.reindexFacesAndVertices();
        console.log('finished convex hull');
        console.log('list of convex hull faces', this.faces);
    }

    // Reference for setting a color to each face
    // https://playground.babylonjs.com/#Y8HRP3#11
    buildRenderableMesh(scene) {
        console.log('call buildRenderableMesh');
        const vertexData = new BABYLON.VertexData();

        // Iterates over the list of faces, adding its vertices to a list and building
        // the indices. Besides, it selects the color of the face based on if the face
        // is deleted or not
        // Probably easier to render if vertices aren't unique
        const vertices = []; 
        const faces = [];
        const normals = []
        const lifetime = [];
        for (let f of this.faces) {
            for (let v of f.points) {
                vertices.push(v.x, v.y, v.z);
                const vlen = vertices.length;
                faces.push(vlen-3, vlen-2, vlen-1);
                const normal = f.normal;
                normals.push(normal.x, normal.y, normal.z);
            }
            lifetime.push({createdAt: f.createdAt, deletedAt: f.deletedAt});
        }

        const materials = [];
        const multimaterial = new BABYLON.MultiMaterial("convex-hull", scene);
        
        const animations = new BABYLON.AnimationGroup("convex-hull-anim");

        const START_OPACITY = 0.0;
        const END_OPACITY = CONSTS.HULL_OPACITY;

        const colArr = new Array(this.totalSteps);

        // Create materials and animations for each face
        for (let i = 0; i < lifetime.length; i++) {
            const {createdAt, deletedAt} = lifetime[i];

            const nm = new BABYLON.StandardMaterial("face" + i);
            nm.backFaceCulling = false;
            let col = colArr[createdAt];
            if (col === null || col === undefined) {
                col = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
            }
            colArr[createdAt] = col;
            // console.log('col is', col);
            // nm.diffuseColor = BABYLON.Color3.FromHexString('#0dbaaf');
            nm.diffuseColor = col;
        
            materials.push(nm);
            multimaterial.subMaterials.push(nm);

            const animation = new BABYLON.Animation("face" + i, "alpha", CONSTS.FPS, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
            const keys = [];
            keys.push(
                {frame: 0, value: 0},
                {frame: createdAt*CONSTS.FPS, value: START_OPACITY},
                {frame: (createdAt+1)*CONSTS.FPS, value: END_OPACITY}
            );

            if (deletedAt) {
                keys.push(
                    {frame: deletedAt*CONSTS.FPS, value: END_OPACITY},
                    {frame: (deletedAt+1)*CONSTS.FPS, value: START_OPACITY}
                );
            }

            // console.log('keys for face', i, keys);
            animation.setKeys(keys);

            animations.addTargetedAnimation(animation, nm);
        }

        animations.normalize();

        vertexData.positions = vertices;
        vertexData.indices = faces;
        vertexData.normals = normals;

        vertexData.applyToMesh(this.renderableMesh);

        // Create a submesh for every face
        this.renderableMesh.subMeshes = [];
        for (let i = 0; i < lifetime.length; i++) {
            new BABYLON.SubMesh(i, 0, vertices.length, i*3, 3, this.renderableMesh);
        }

        this.renderableMesh.material = multimaterial;

        this.constructionAnimation = animations;
    }
}

export {Quickhull3D};