import { Face } from "./Face";

// A simplex is a tetrahedron containing a list of faces
export default class Simplex {
    constructor() {

    }

    buildFromFaces(facesList) {
        if (facesList.length !== 4) {
            throw new Error("Creating a simplex with a number of faces != 4!");
        }
        this.faces = facesList;
    }

    buildFromPoints(tetr) {
        if (pts.length !== 4) {
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

    intersects(other) {
        for (let thisf of this.faces) {
            if (other.faces.some(otherf => thisf.intersects(otherf))) {
                return true;
            }
        }
        return false;
    }
}