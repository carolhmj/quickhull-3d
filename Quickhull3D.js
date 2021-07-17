
class Quickhull3D {
    DIM_TO_AXIS = {
        0: 'x',
        1: 'y',
        2: 'z'
    }

    constructor() {
        this.vertexList = []; // List of BABYLON.Vector3 objects 
        this.claimed = [] // List of BABYLON.Vector3 objects
    }

    // Returns the distance from point p to the line defined by b-a
    // From: https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
    pointToLineDistance(a, b, p) {
        const direction = b.subtract(a);
        //direction.normalize();

        const aMinusP = p.subtract(a);
        return aMinusP.cross(direction).length() / direction.length();
    }

    signedDistanceToPlane(a, b, c, p) {
        const normal = b.subtract(a).cross(c.subtract(a));
        normal.normalize();

        return BABYLON.Vector3.Dot(normal, p.subtract(a));
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

        for (let v in this.vertexList) {
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

        console.log('max distance', maxDistance);
        console.log('max axis', maxAxis);

        const v1 = minVertices[maxAxis];
        const v2 = maxVertices[maxAxis];
        
        let maxDist = Number.MIN_VALUE;
        let maxVertex = null;
        // For the third vertex, choose the one with the max distance to the line formed by the first two
        for (let v in this.vertexList) {
            const distance = this.pointToLineDistance(v2, v1, v);
            if (distance > maxDist) { 
                maxDist = distance;
                maxVertex = v;
            }
        }

        const v3 = maxVertex;

        // For the fourth vertex, choose the one with the max distance to the plane formed by the first three
        maxDist = Number.MIN_VALUE;
        maxVertex = null;
        for (let v in this.vertexList) {
            const distance = Math.abs(this.signedDistanceToPlane(v1, v2, v3, v));
            if (distance > maxDist) {
                maxDist = distance;
                maxVertex = v;
            }
        }

        const v4 = maxVertex;
    }

    build(inputPoints) {
        console.log('got vertices', inputPoints);
        console.log('v', inputPoints[0][this.DIM_TO_AXIS[0]]);
        this.vertexList = [...inputPoints]; 
    }

    // Returns a Babylon mesh for the convex hull
    render() {
        const mesh = new BABYLON.Mesh("mesh");
        const vertexData = new BABYLON.VertexData();

    }
}

export {Quickhull3D};