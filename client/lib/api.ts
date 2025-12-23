const Api_base="http://localhost:5000/api";

export async function apiRequest(
    endpoint:string , 
    data:any 
){
    const res= await fetch(Api_base+endpoint,{
        method:"POST",
        headers:{
            "content-type":"application/json"
        },
        body:JSON.stringify(data),
        credentials:"include"
    })

    if(!res.ok){
         const err=await res.json();
            throw new Error(err.error ||"API request failed");
    }
    return res.json();
}
