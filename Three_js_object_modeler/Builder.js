import { Point3D, Polygon, LinearRing, MultiSurface } from "./CityGMLGeometricModel";
import { VertexData, TriangleData } from "./graphicalModels";
import { PointData, FaceData, EdgeData, HalfEdgeData } from "./GeometricalProxy";
import { Building, BuildingPart, ClosureSurface, WallSurface, FloorSurface, OuterFloorSurface, GroundSurface, RoofSurface } from "./CityGMLLogicalModel";
import { Controller } from "./controller";
import * as Utils from './utils/utils';

class SceneBuilder{
    constructor(){
        this.triangle_data    = {'fIndex':[], 'vIndex':[], 'tIndex':[], 'pIndex':[]};
        this.face_data        = {'tIndex':[], 'bIndex': [], 'type':[], 'planeEquation':[], 'center':[]};
        this.vertex_data      = {'position':[], 'normal':[], 'uv': [], 'fIndex': [], 'pIndex': [], 'vIndex': [], 'eIndex': []};
        this.point_data       = {'vIndex': []};
        this.dual_graph_data       = {'edges': []};
        this.edge_data            = {};
        this.halfedge_data        = {};
        this.triangle_data_object = {};
        this.vertex_data_object   = {};
        this.face_data_object     = {};
        this.point_data_object    = {};
        this.dual_graph_object    = {};
        this.geometricalModel     = {};
    } 
    build(Buildings, LoD, material){
        let nPts = Point3D.maxId;
        this.triangle_data    = {'fIndex':[], 'vIndex':[], 'tIndex':[], 'pIndex':[]};
        this.face_data        = {'tIndex':new Array(nPts), 'bIndex': new Array(Polygon.maxId), 'type':new Array(Polygon.maxId), 'planeEquation':new Array(Polygon.maxId), 'center':new Array(3*Polygon.maxId)};
        this.vertex_data      = {'position':[], 'normal':[], 'uv': [], 'fIndex': [], 'pIndex': [], 'vIndex': [], 'eIndex1': [], 'eIndex2': []};
        this.point_data       = {'vIndex': new Array(nPts),'nbAdjacentFaces': new Array(nPts)};
        this.edge_data        = {'halfEdgeIndex':new Array(2*nPts*(nPts+1))};
        this.halfedge_data    = {'eIndex':new Array(2*nPts*(nPts+1)), 'vIndex':new Array(4*nPts*(nPts+1))};
        this.geometricalModel = Buildings;
        this.LoD = LoD;
        
        Buildings.forEach(building=>{
            let boundaryThematicSurfaces = building.getBoundary();
            boundaryThematicSurfaces.forEach(thematicSurface=>{
                let type = thematicSurface.getType();
                let boundarySurfaces = thematicSurface.getLoD(LoD).surfaces;

                boundarySurfaces.forEach(polygon=>{

                    let nt = polygon.triangulation.length/3;
                    let normal = polygon.planeEquation.slice(0,3);
    
                    //this.face_data filling
                    let first_triangle_index = this.triangle_data.vIndex.length/3;
                    this.face_data.tIndex[polygon.id] = first_triangle_index;
                    this.face_data.bIndex[polygon.id] = building.id;
                    this.face_data.type[polygon.id]   = type;
                    this.face_data.planeEquation[polygon.id] = polygon.planeEquation;
    
                    for(let i=0; i<nt; i++){
                        let id_p1 = polygon.triangulation[3*i  ];
                        let id_p2 = polygon.triangulation[3*i+1];
                        let id_p3 = polygon.triangulation[3*i+2];
    
                        let p1 = polygon.find(id_p1);
                        let p2 = polygon.find(id_p2);
                        let p3 = polygon.find(id_p3);


    
                        let n_vert = this.vertex_data.position.length/3;
    
                        //this.vertex_data filling
                        this.vertex_data.position = this.vertex_data.position.concat([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z]);
                        this.vertex_data.normal   = this.vertex_data.normal.concat([normal[0], normal[1], normal[2], normal[0], normal[1], normal[2], normal[0], normal[1], normal[2]]);
                        this.vertex_data.fIndex   = this.vertex_data.fIndex.concat([polygon.id, polygon.id, polygon.id]);
                        this.vertex_data.pIndex   = this.vertex_data.pIndex.concat([p1.id, p2.id, p3.id]);
    


                        //this.point_data filling
                        if(this.point_data.vIndex[p1.id]==null){
                            this.point_data.vIndex[p1.id] = n_vert;
                        }
                        if(this.point_data.vIndex[p2.id]==null){
                            this.point_data.vIndex[p2.id] = n_vert+1;
                        }
                        if(this.point_data.vIndex[p3.id]==null){
                            this.point_data.vIndex[p3.id] = n_vert+2;
                        }
    
                        //this.triangle_data filling
                        this.triangle_data.vIndex.push(n_vert,n_vert+1,n_vert+2);
                        this.triangle_data.pIndex.push(id_p1, id_p2, id_p3);
                        this.triangle_data.fIndex.push(polygon.id);
                        //this.triangle_data.tIndex = this.triangle_data.tIndex.concat(this.findTrianglesNeighbours([id_p1, id_p2, id_p3], polygon.triangulation));
                    }


                    //Creates the edges & half-edges data
                    let n = polygon.exterior.positions.length;
                    for(let i=0; i<n; i++){
                        let u = polygon.exterior.positions[i].id;
                        let v = polygon.exterior.positions[(i+1)%n].id;


                        let he_id = Utils.computeHalfEdgeRank(u,v);
                        let e_id  = Utils.computeEdgeRank(u,v);


                        this.halfedge_data.vIndex[2*he_id] = u;
                        this.halfedge_data.vIndex[2*he_id+1] = v;

                        this.halfedge_data.eIndex[he_id] = e_id;

                        if(this.edge_data.halfEdgeIndex[2*e_id]==null){
                            this.edge_data.halfEdgeIndex[2*e_id] = he_id;
                        }
                        else{
                            this.edge_data.halfEdgeIndex[2*e_id+1] = he_id;
                        }

                    }

                    n = polygon.interior.positions.length;
                    for(let i=0; i<n; i++){
                        let u = polygon.interior.positions[i].id;
                        let v = polygon.interior.positions[(i+1)%n].id;


                        let he_id = Utils.computeHalfEdgeRank(u,v);
                        let e_id  = Utils.computeEdgeRank(u,v);


                        this.halfedge_data.vIndex[2*he_id] = u;
                        this.halfedge_data.vIndex[2*he_id+1] = v;

                        this.halfedge_data.eIndex[he_id] = e_id;

                        if(this.edge_data.halfEdgeIndex[2*e_id]==null){
                            this.edge_data.halfEdgeIndex[2*e_id] = he_id;
                        }
                        else{
                            this.edge_data.halfEdgeIndex[2*e_id+1] = he_id;
                        }

                    }



                })
            })
        })


        //On parcours les triangles pour remplir le pointeur vertex to edge
        this.vertex_data.eIndex1 = new Array(this.vertex_data.pIndex.length);
        this.vertex_data.eIndex2 = new Array(this.vertex_data.pIndex.length);
        
        this.vertex_data.eIndex1.fill(-3);
        this.vertex_data.eIndex2.fill(-3);

        for(let i=0; i<this.triangle_data.fIndex.length; i++){
            let v1 = this.triangle_data.vIndex[3*i];
            let v2 = this.triangle_data.vIndex[3*i+1];
            let v3 = this.triangle_data.vIndex[3*i+2];

            let p1 = this.vertex_data.pIndex[v1];
            let p2 = this.vertex_data.pIndex[v2];
            let p3 = this.vertex_data.pIndex[v3];

            let e_id1 = Utils.computeEdgeRank(p1, p2);
            let e_id2 = Utils.computeEdgeRank(p2, p3);
            let e_id3 = Utils.computeEdgeRank(p3, p1);

            let he_id1 = Utils.computeHalfEdgeRank(p1, p2);
            let he_id2 = Utils.computeHalfEdgeRank(p2, p3);
            let he_id3 = Utils.computeHalfEdgeRank(p3, p1);




            
            
            if(this.edge_data.halfEdgeIndex[2*e_id1]!=null){
                //console.log(v1,v2, e_id1);
                this.vertex_data.eIndex1[v1]=e_id1;
                this.vertex_data.eIndex2[v2]=e_id1;
                this.halfedge_data.vIndex[2*he_id1] = v1;
                this.halfedge_data.vIndex[2*he_id1+1] = v2;
            }
            if(this.edge_data.halfEdgeIndex[2*e_id2]!=null){
                //console.log(v2,v3, e_id2);
                this.vertex_data.eIndex1[v2]=e_id2;
                this.vertex_data.eIndex2[v3]=e_id2;
                this.halfedge_data.vIndex[2*he_id2] = v2;
                this.halfedge_data.vIndex[2*he_id2+1] = v3;
            }
            if(this.edge_data.halfEdgeIndex[2*e_id3]!=null){
                //console.log(v3,v1, e_id3);
                this.vertex_data.eIndex1[v3]=e_id3;
                this.vertex_data.eIndex2[v1]=e_id3;
                this.halfedge_data.vIndex[2*he_id3] = v3;
                this.halfedge_data.vIndex[2*he_id3+1] = v1;
            }
        }
        console.log(this.vertex_data);
        console.log(this.edge_data);
        console.log(this.halfedge_data);


        
        



        //Compute the centers of each face

        for(let i=0; i<this.face_data.tIndex.length; i++){
            let n=0;
            let [cx, cy, cz] = [0,0,0];
            for(let j=0; j<this.vertex_data.fIndex.length; j++){
                if(this.vertex_data.fIndex[j]==i){
                    n+=1;
                    cx+=this.vertex_data.position[3*j];
                    cy+=this.vertex_data.position[3*j+1];
                    cz+=this.vertex_data.position[3*j+2];
                }
            }
            this.face_data.center[3*i]   = cx/n;
            this.face_data.center[3*i+1] = cy/n;
            this.face_data.center[3*i+2] = cz/n;

            
        }
        console.log("center_computed");

        //Compute the neighbours of each triangle
        let nb_t = this.triangle_data.fIndex.length;
        let globalTriangulation = [];
        
        for(let i=0; i<nb_t ;i++){
            let v1 = this.triangle_data.vIndex[3*i];
            let v2 = this.triangle_data.vIndex[3*i+1];
            let v3 = this.triangle_data.vIndex[3*i+2];
            globalTriangulation.push(this.vertex_data.pIndex[v1], this.vertex_data.pIndex[v2], this.vertex_data.pIndex[v3]);
        }
        for(let i=0; i<nb_t ;i++){
            let triangle = [globalTriangulation[3*i], globalTriangulation[3*i+1], globalTriangulation[3*i+2]];
            let neighbours = this.findTrianglesNeighbours(triangle, globalTriangulation);
            this.triangle_data.tIndex[3*i  ] = neighbours[0];
            this.triangle_data.tIndex[3*i+1] = neighbours[1];
            this.triangle_data.tIndex[3*i+2] = neighbours[2];
        }

        console.log("triangles neighbours computed");

        //And then we find the neighbours of the vertices

        
        this.vertex_data.vIndex = new Array(2*this.vertex_data.fIndex.length);

        
        for(let i=0; i<nb_t ;i++){
            let id_v1 = this.triangle_data.vIndex[3*i];
            let id_v2 = this.triangle_data.vIndex[3*i+1];
            let id_v3 = this.triangle_data.vIndex[3*i+2];

            let neighbours_v1 = this.findVertexNeighbour(0, i);
            let neighbours_v2 = this.findVertexNeighbour(1, i);
            let neighbours_v3 = this.findVertexNeighbour(2, i);

            this.vertex_data.vIndex[2*id_v1]   = neighbours_v1[0];
            this.vertex_data.vIndex[2*id_v1+1] = neighbours_v1[1];
            this.vertex_data.vIndex[2*id_v2]   = neighbours_v2[0];
            this.vertex_data.vIndex[2*id_v2+1] = neighbours_v2[1];
            this.vertex_data.vIndex[2*id_v3]   = neighbours_v3[0];
            this.vertex_data.vIndex[2*id_v3+1] = neighbours_v3[1];

        }

        console.log("vertices neighbours computed");

        //computes the number of faces adjacent to the points
        for(let i=0; i<this.point_data.nbAdjacentFaces.length; i++){
            let firstVIndex = this.point_data.vIndex[i];
            let faces  = [this.vertex_data.fIndex[firstVIndex]];
            let oldVIndex_1 = firstVIndex;
            let oldVIndex_2 = firstVIndex;

            let vIndex1 = this.vertex_data.vIndex[2*firstVIndex];
            let vIndex2 = this.vertex_data.vIndex[2*firstVIndex+1];
            let ended = false;
            while(!ended){
                //console.log(i + ': '+vIndex1+' | '+vIndex2);
                let face1 = this.vertex_data.fIndex[vIndex1];
                let face2 = this.vertex_data.fIndex[vIndex2];
    
                if(!faces.includes(face1)){
                    faces.push(face1);
                }
                if(!faces.includes(face2)){
                    faces.push(face2);
                }

                
                
                //On cherche les points suivants dans la rotation
                if(this.vertex_data.vIndex[2*vIndex1]==oldVIndex_1){
                    oldVIndex_1 = vIndex1;
                    vIndex1 = this.vertex_data.vIndex[2*vIndex1+1];
                }
                else{
                    oldVIndex_1 = vIndex1;
                    vIndex1 = this.vertex_data.vIndex[2*vIndex1];
                }
                if(this.vertex_data.vIndex[2*vIndex2]==oldVIndex_2){
                    oldVIndex_2 = vIndex2;
                    vIndex2 = this.vertex_data.vIndex[2*vIndex2+1];
                }
                else{
                    oldVIndex_2 = vIndex2;
                    vIndex2 = this.vertex_data.vIndex[2*vIndex2];
                }

                //On a fini lorsque la rotation gauche et la droite se finissent, cad lorsque
                //les 2 vIndex sont égaux, ou lorsque qu'ils valent l'ancienne valeur de l'autre
                //(v1old = v2 et v2old = v1)
                ended = (oldVIndex_1 == oldVIndex_2)||(vIndex1==oldVIndex_2);
                

            }
            this.point_data.nbAdjacentFaces[i]=faces.length;
        }

        console.log("face arrity computed");

        

        this.triangle_data_object = new TriangleData(this.triangle_data.fIndex, this.triangle_data.vIndex, this.triangle_data.tIndex);
        this.vertex_data_object   = new VertexData(this.vertex_data.position, this.vertex_data.normal, this.vertex_data.uv, this.vertex_data.fIndex, this.vertex_data.pIndex, this.vertex_data.vIndex, this.vertex_data.eIndex1, this.vertex_data.eIndex2, material);
        this.face_data_object     = new FaceData(this.face_data.tIndex, this.face_data.planeEquation,this.face_data.center);
        this.point_data_object    = new PointData(this.point_data.vIndex, this.point_data.nbAdjacentFaces);
        this.edge_data_object     = new EdgeData(this.edge_data.halfEdgeIndex);
        this.halfedge_data_object = new HalfEdgeData(this.halfedge_data.eIndex, this.halfedge_data.vIndex);

        //Construction du graphe dual de la scene, et de la liste des edges


        let edges = [];
        let dualEdges = [];

        for(let i=0; i<this.triangle_data.fIndex.length; i++){

            let p1 = this.triangle_data.pIndex[3*i  ];
            let p2 = this.triangle_data.pIndex[3*i+1];
            let p3 = this.triangle_data.pIndex[3*i+2];
            let pts = [p1,p2,p3];
            let faces = [this.findAdjacentFaces(p1),this.findAdjacentFaces(p2),this.findAdjacentFaces(p3)];


            for(let id1=0; id1<3; id1++){
                for(let id2=id1+1; id2<3; id2++){
                    let commonFaces = Utils.getCommonElts(faces[id1], faces[id2]);
                    if(commonFaces.length==2 ){
                        let t_edges = [];
                        let t_dualEdges = [];
                        let idp1 = pts[id1];
                        let idp2 = pts[id2];
                        t_edges.push([Math.min(idp1, idp2),Math.max(idp1, idp2)]);
                        t_dualEdges.push([Math.min(commonFaces[0], commonFaces[1]),Math.max(commonFaces[0], commonFaces[1])]);

                        edges = Utils.mergeListsWithoutDoublesV2(edges, t_edges);
                        dualEdges = Utils.mergeListsWithoutDoublesV2(dualEdges, t_dualEdges);
                    }
                }
            }
        }
        console.log("end");
    }

    /**
     * 
     * @returns A Controller object corresponding to this scene.
     */
    getScene(){
        return (new Controller(this.vertex_data_object, this.triangle_data_object, this.face_data_object, this.point_data_object, this.edge_data_object, this.halfedge_data_object, this.geometricalModel, this.LoD));
        
    }







    /**
     * 
     * @param {int} pointId : 
     * @returns 
     */
    findAdjacentFaces(pointId){
        let firstVIndex = this.point_data_object.vIndex[pointId];
        let faces  = [this.vertex_data_object.fIndex.getX(firstVIndex)];
        let oldVIndex_1 = firstVIndex;
        let oldVIndex_2 = firstVIndex;

        let vIndex1 = this.vertex_data_object.vIndex.getX(firstVIndex);
        let vIndex2 = this.vertex_data_object.vIndex.getY(firstVIndex);
        let ended = false;
        while(!ended){
            //console.log(pointId + ': '+vIndex1+' | '+vIndex2);
            let face1 = this.vertex_data_object.fIndex.getX(vIndex1);
            let face2 = this.vertex_data_object.fIndex.getX(vIndex2);
   
            if(!faces.includes(face1)){
                faces.push(face1);
            }
            if(!faces.includes(face2)){
                faces.push(face2);
            }

            
            
            //On cherche les points suivants dans la rotation
            if(this.vertex_data_object.vIndex.getX(vIndex1)==oldVIndex_1){
                oldVIndex_1 = vIndex1;
                vIndex1 = this.vertex_data_object.vIndex.getY(vIndex1);
            }
            else{
                oldVIndex_1 = vIndex1;
                vIndex1 = this.vertex_data_object.vIndex.getX(vIndex1);
            }
            if(this.vertex_data_object.vIndex.getX(vIndex2)==oldVIndex_2){
                oldVIndex_2 = vIndex2;
                vIndex2 = this.vertex_data_object.vIndex.getY(vIndex2);
            }
            else{
                oldVIndex_2 = vIndex2;
                vIndex2 = this.vertex_data_object.vIndex.getX(vIndex2);
            }

            //On a fini lorsque la rotation gauche et la droite se finissent, cad lorsque
            //les 2 vIndex sont égaux, ou lorsque qu'ils valent l'ancienne valeur de l'autre
            //(v1old = v2 et v2old = v1)
            ended = (oldVIndex_1 == oldVIndex_2)||(vIndex1==oldVIndex_2);
            

        }
        return faces;

    }





    /**
     * 
     * @param {int[]} triangle : tableau des indices des points formant le triangle
     * @param {int[]} triangles_array : tableau des indices des points formant tout les triangle
     * @returns 
     */
    findTrianglesNeighbours(triangle, triangles_array){
        let neighbours = [null,null,null];

        let nb_neighbours = 0;
        

        for(let i=0; i<triangles_array.length/3; i++){
            let common_pts = [false, false, false];

            let common1 = triangle.indexOf(triangles_array[3*i  ]);
            let common2 = triangle.indexOf(triangles_array[3*i+1]);
            let common3 = triangle.indexOf(triangles_array[3*i+2]);

            if(common1!=-1){
                common_pts[common1] = true;
            }
            if(common2!=-1){
                common_pts[common2] = true;
            }
            if(common3!=-1){
                common_pts[common3] = true;
            }
            

            //Pour savoir de quel "côté" du triangle se trouve le voisin, on stocke l'indice du voisin
            //à l'indice correspondant au point opposé au voisin 
            //ex : on stocke dans la case 2 le voisin collé sur l'arrête 0-1, car le point 2 est le point qui lui est opposé.
            if(common_pts[0]&&common_pts[1]&&(!common_pts[2])){
                neighbours[2] = i;
                nb_neighbours+=1;
            }
            else if(common_pts[0]&&(!common_pts[1])&&common_pts[2]){
                neighbours[1] = i;
                nb_neighbours+=1;
            }
            else if((!common_pts[0])&&common_pts[1]&&common_pts[2]){
                neighbours[0] = i;
                nb_neighbours+=1;
            }
            if(nb_neighbours==3){
                break;
            }
        }
        return neighbours;

    }






    /**
     * Retrouve les 2 vertex voisins du vertex actuel (voisins par triangles adjacents)
     * @param {*} vertex_id : position of the vertex in the triangle
     * @param {*} id_triangle : position of the triangle in the triangle_data object
     */
    findVertexNeighbour(vertex_pos, id_triangle){

        let result = [null, null];

        let neighbour_1, neighbour_2;
        let vertex_index = this.triangle_data.vIndex[3*id_triangle+vertex_pos];
        if(vertex_pos == 0){
            neighbour_1 = 1;
            neighbour_2 = 2;
        }
        if(vertex_pos == 1){
            neighbour_1 = 0;
            neighbour_2 = 2;
        }
        if(vertex_pos == 2){
            neighbour_1 = 0;
            neighbour_2 = 1;
        }

        let neighbour_id1 = this.triangle_data.tIndex[3*id_triangle+neighbour_1];
        let neighbour_id2 = this.triangle_data.tIndex[3*id_triangle+neighbour_2];

        let id_pt = this.vertex_data.pIndex[vertex_index];

        


        let n1_vert_1 = this.triangle_data.vIndex[3*neighbour_id1];
        let n1_vert_2 = this.triangle_data.vIndex[3*neighbour_id1+1];
        let n1_vert_3 = this.triangle_data.vIndex[3*neighbour_id1+2];

        let id_n1_vert_1 = this.vertex_data.pIndex[n1_vert_1];
        let id_n1_vert_2 = this.vertex_data.pIndex[n1_vert_2];
        let id_n1_vert_3 = this.vertex_data.pIndex[n1_vert_3];


        if(id_n1_vert_1==id_pt){
            result[0] = n1_vert_1;
        }
        else if(id_n1_vert_2==id_pt){
            result[0] = n1_vert_2;
        }
        else if(id_n1_vert_3==id_pt){
            result[0] = n1_vert_3;
        }

    
        let n2_vert_1 = this.triangle_data.vIndex[3*neighbour_id2];
        let n2_vert_2 = this.triangle_data.vIndex[3*neighbour_id2+1];
        let n2_vert_3 = this.triangle_data.vIndex[3*neighbour_id2+2];

        let id_n2_vert_1 = this.vertex_data.pIndex[n2_vert_1];
        let id_n2_vert_2 = this.vertex_data.pIndex[n2_vert_2];
        let id_n2_vert_3 = this.vertex_data.pIndex[n2_vert_3];

        if(id_n2_vert_1==id_pt){
            result[1] = n2_vert_1;
        }
        else if(id_n2_vert_2==id_pt){
            result[1] = n2_vert_2;
        }
        else if(id_n2_vert_3==id_pt){
            result[1] = n2_vert_3;
        }
        

        return(result);

    }

}

class ModelBuilder{
    constructor(){
        this.buildings = [];
    }

    build(buildingJsObject){
        let buildingParts = [];

        
        buildingJsObject.buildingParts.forEach(
            buildingPart=>{
                let bp_points = [];
                let bp_polygons = [];
                buildingPart.points.forEach(
                    p=>{
                        bp_points.push(new Point3D(p[0], p[1], p[2]));
                })

                //Creation of the polygons
                buildingPart.faces.forEach(
                    f=>{
                        let exteriorPointsList = [];
                        f[0].forEach(
                            p_index=>{
                                exteriorPointsList.push(bp_points[p_index]);
                            }
                        )
                        let exterior = new LinearRing(exteriorPointsList);

                        let interiorPointsList = [];
                        f[1].forEach(
                            p_index=>{
                                interiorPointsList.push(bp_points[p_index]);
                            }
                        )
                        let interior = new LinearRing(interiorPointsList);

                        bp_polygons.push(new Polygon(interior, exterior));
                })

                //On corrige l'orientation des normales si besoin
                /*bp_polygons.forEach(
                    //Pour chaque polygon, on vérifie combien d'autres polygon sa normale 
                    //va croiser
                    polygon=>{
                        let nb_crossed_polygons = 0;
                        bp_polygons.forEach(polygon2=>{
                            if(polygon2.id != polygon.id){
                                let pt = polygon.exterior.positions[0];
                                let t = polygon2.intersectRay([pt.x, pt.y, pt.z], polygon.planeEquation.slice(0,3));
                                if(!isNaN(t) && t>0){
                                    nb_crossed_polygons+=1;
                                }
                            }
                            
                        });
                        if(nb_crossed_polygons%2==1){
                            console.log("invert "+polygon);
                            polygon.invertPlaneEquation();
                        }
                    }
                );*/

                //Pour l'instant, on ne regroupe pas les faces en multi surfaces
                let bp_thematicSurfaces = [];
                bp_polygons.forEach(
                    polygon=>{
                        let multi_polygon = new MultiSurface([polygon]);
                        //Pour l'instant on ne s'occupe pas des LoD
                        bp_thematicSurfaces.push(new WallSurface(multi_polygon, multi_polygon, multi_polygon, multi_polygon));
                    }
                )
                buildingParts.push(new BuildingPart(bp_thematicSurfaces));
            })
            this.buildings.push(new Building(buildingParts));
    }
    getBuildings(){
        return this.buildings;
    }
}

export {ModelBuilder, SceneBuilder}