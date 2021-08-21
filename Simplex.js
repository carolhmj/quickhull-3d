import { Face } from "./Face.js";

// A simplex is a tetrahedron containing a list of faces
export default class Simplex {
    constructor() {

    }

    // check if normal of face p1, p2, p3 is on the opposite direction to p
    checkNormalOpposite(p1, p2, p3, p) {
        // triangle centroid
        const c = p1.add(p2).add(p3).scale(0.333);
        console.log('c', c);

        // line from centroid to point p
        const cp = p.subtract(c);
        console.log('cp', cp);
        cp.normalizeToRef(cp);

        // triangle normal
        const p1p2 = p2.subtract(p1);
        const p3p1 = p3.subtract(p1);

        const n = BABYLON.Vector3.Cross(p1p2, p3p1);
        n.normalizeToRef(n);

        const angle = BABYLON.Vector3.Dot(cp, n);
        return angle < 0;
    }

    buildFromFaces(facesList) {
        if (facesList.length !== 4) {
            throw new Error("Creating a simplex with a number of faces != 4!");
        }
        this.faces = facesList;
    }

    buildFromPoints(tetr) {
        if (tetr.length !== 4) {
            throw new Error("Creating a simplex with number of points != 4!");
        }

        // let tetrs = [pts];

        let i = 0;
        // for (let tetr of tetrs) {
            const centr = tetr[0].add(tetr[1]).add(tetr[2]).add(tetr[3]).scale(0.25);
            // console.log('centr', centr);
            // Create tetrahedron faces
            const tp = tetr.map(pt => [pt.x, pt.y, pt.z]).flat();
            // console.log('pts', tp);
            const idxs = [
                0, 1, 2,
                1, 2, 3,
                0, 2, 3,
                0, 1, 3
            ];

            for (let i = 0; i < idxs.length; i += 3) {
                const isOpposite = this.checkNormalOpposite(
                    tetr[idxs[i]], 
                    tetr[idxs[i+1]], 
                    tetr[idxs[i+2]], 
                    centr);
                if (!isOpposite) {
                    // reverse order of indices
                    let aux = idxs[i];
                    idxs[i] = idxs[i+2];
                    idxs[i+2] = aux;
                }
            }

            // const vertexData = new BABYLON.VertexData();
            // vertexData.positions = tp;
            // vertexData.indices = idxs;

            // const name = "tetr" + i++;
            // const mesh = new BABYLON.Mesh(name, scene);
            // vertexData.applyToMesh(mesh);
            // mesh.material = new BABYLON.StandardMaterial(name, scene);
            // mesh.material.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random())
        // }

        const faces = [];
        for (let i = 0; i < idxs.length; i += 3) {
            const face = new Face();
            face.buildFromPoints(tetr[idxs[i]], tetr[idxs[i+1]], tetr[idxs[i+2]]);
            faces.push(face);
        }

        this.faces = faces;
    }

    getPoints() {
        return this.points.map(f => f.points).flat();
    }

    getEdges() {
        return this.faces.map(f => f.edges).flat();
    }

    // intersects(other) {
    //     for (let thisf of this.faces) {
    //         if (other.faces.some(otherf => thisf.intersects(otherf))) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }
    getInterval(points, axis) {
        let res = {min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER};

        for (let point of points) {
            const proj = BABYLON.Vector3.Dot(point, axis);
            res.min = Math.min(proj, res.min);
            res.max = Math.max(proj, res.max);
        }

        return res;
    }

    intersects(other) {
        for (let thisEdge of this.getEdges()) {
            for (let otherEdge of other.getEdges()) {
                const axis = BABYLON.Cross(thisEdge.vector(), otherEdge.vector());

                const thisInt = this.getInterval(this.getPoints(), axis);
                const otherInt = this.getInterval(this.getPoints(), axis);

                const int1 = thisInt.max < otherInt.min;
                const int2 = otherInt.max < thisInt.min; 
                if (!int1 && !int2) return false; // found a separating axis
            }
        }
        return true; // didn't find a separating axis 
    }
}