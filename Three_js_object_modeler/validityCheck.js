import * as Utils from './utils/utils';


// on verifie la topologie de data donc passer la data et non le controller
function isTopologicallyValid(geometricalController){

    let valid = true;

    let issue = "";

    //Check if the object has no borders 
    //(=> every half-edge has an opposite, which is not itself)

    for(let i=0; i<geometricalController.halfEdgeData.count; i++){
        let o = geometricalController.halfEdgeData.opposite(i)
        valid = o!=i && o!=null;
        if(!valid){
            break;
        }
    }

    if(!valid){
        issue = "borders exists";
    }

    //Check that there is no undifined data
    //--->Points
    if(valid){
        for(let i=0; i<geometricalController.pointData.count; i++){
            let he = geometricalController.pointData.heIndex[i];
            valid = he!=null;
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "there are undifined point data";
        }
    }

    
    

    //--->half-edges
    if(valid){
        for(let i=0; i<geometricalController.halfEdgeData.count; i++){
            let p = geometricalController.halfEdgeData.pIndex[i];
            let o = geometricalController.halfEdgeData.oppIndex[i];
            let n = geometricalController.halfEdgeData.nextIndex[i];
            let f = geometricalController.halfEdgeData.fIndex[i];
            let e = geometricalController.halfEdgeData.eIndex[i];
            valid = (p!=null && o!=null && n!=null && f!=null && e!=null);
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "there are undifined half-edge data";
        }
    }


    
    //--->edges
    if(valid){
        for(let i=0; i<geometricalController.edgeData.count; i++){
            let he = geometricalController.edgeData.heIndex[i];
            valid = he!=null;
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "there are undifined edge data";
        }
    }



    //--->faces
    if(valid){
        for(let i=0; i<geometricalController.faceData.count; i++){
            let p  = geometricalController.faceData.planeEquation[i];
            let he = geometricalController.faceData.hExtIndex[i];
            let hi = geometricalController.faceData.hIntIndices[i];
            valid = (p!=null && he!=null && hi!=null);
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "there are undifined face data";
        }
    }



    //Check that all the faces borders are well defined
    if(valid){
        let nb_he = geometricalController.halfEdgeData.count;
        for(let i=0; i<geometricalController.faceData.count; i++){
            let he  = geometricalController.faceData.hExtIndex[i][0];
            let hi = geometricalController.faceData.hIntIndices[i];

            let visited_edges = [];

            let j=0;
            let he_0 = he;
            //check that every border is a loop
            do{
                visited_edges = Utils.mergeListsWithoutDoubles(visited_edges,[he]);

                he = geometricalController.halfEdgeData.next(he);
                j++;
            }while(he_0!=he && j<=nb_he)
            valid = j<=nb_he;
            if(!valid){
                issue = "exterior loop issue";
                break;
            }

            for(let k=0; k<hi.length; k++){
                let hi_0 = hi[k];
                let h    = hi_0;
                do{
                    visited_edges = Utils.mergeListsWithoutDoubles(visited_edges,[h]);
    
                    h = geometricalController.halfEdgeData.next(h);
                    j++;
                }while(hi_0!=h && j<=nb_he)
                valid = j<=nb_he;
                if(!valid){
                    break;
                }
            }
            if(!valid){
                issue = "interior loop issue";
                break;
            }
            //check that all the face's half-edge have been visited
            for(let k=0; k<geometricalController.halfEdgeData.count; k++){
                if(geometricalController.halfEdgeData.fIndex[k]==i){
                    valid = visited_edges.indexOf(k)!=-1;
                    if(!valid){
                        break;
                    }
                }
            }
            if(!valid){
                issue = "half-edge not visited";
                break;
            }
        }
        if(!valid){
            issue = "borders are not well defined : "+issue;
        }
    }

    //Check that all points have just one well defined half-edges orbit
    if(valid){
        let nb_he = geometricalController.halfEdgeData.count;
        for(let i=0; i<geometricalController.pointData.count; i++){
            let he  = geometricalController.pointData.heIndex[i][0];

            let visited_edges = [];

            let j=0;
            let he_0 = he;
            //check that every orbit is a loop
            do{
                visited_edges = Utils.mergeListsWithoutDoubles(visited_edges,[he]);

                he = geometricalController.halfEdgeData.opposite(he);
                he = geometricalController.halfEdgeData.next(he);
                j++;
            }while(he_0!=he && j<=nb_he)
            valid = j<=nb_he;
            if(!valid){
                break;
            }

            
            //check that all the point's half-edge have been visited
            for(let k=0; k<geometricalController.halfEdgeData.count; k++){
                if(geometricalController.halfEdgeData.pIndex[k]==i){
                    valid = visited_edges.indexOf(k)!=-1;
                    if(!valid){
                        break;
                    }
                }
            }
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "points' orbits are not well defined";
        }
    }

    //Check that all edges are well defined
    if(valid){
        for(let i=0; i<geometricalController.halfEdgeData.count; i++){
            let he  = i;
            let he_o  = geometricalController.halfEdgeData.opposite(he);
            let he_oo  = geometricalController.halfEdgeData.opposite(he_o);

            valid = (he!=he_o) && (he==he_oo);
            
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "edges are not well defined";
        }
    }

    if(valid){
        console.log(geometricalController, "VALID");
    }
    else{
        console.warn(geometricalController, "NOT VALID, "+issue);
    }
    
    return valid;
    
}

export{isTopologicallyValid}