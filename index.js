import express from 'express'
import multer from 'multer'
import pb from './db/index.js'
import Joi from 'joi'
import { FormData } from 'formdata-node'
import collections from './db/collections.js'
import { nanoid } from 'nanoid'
import cors from 'cors'
import * as dotenv from 'dotenv'

dotenv.config()
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(multer({storage:multer.memoryStorage() }).single('image') )


app.get('/',(request,response) => {
    response.send("<h1>HelloWorld</h1>")
})

app.post('/api/cubephoto',async (request,response) => {
    // validar datos
    const schema = Joi.object().keys({ 
        name: Joi.string().alphanum().min(3).max(100).required(),
        title: Joi.string().alphanum().min(3).max(100).required(),
        x: Joi.number().integer().required(), 
        y: Joi.number().integer().required(),
        z: Joi.number().integer().required(),
        description: Joi.string().min(5).max(500).optional().allow("")
    });
    const validacion = schema.validate(request.body)

    try{
        if(validacion.error){
            throw validacion.error
        }
    }catch(error){
        response.status(400).json({error,message: 'Los datos estan en el formato incorrecto'})
        return
    }
    // Parsear datos
    const formData = new FormData();

    formData.set('name', request.body.name)
    formData.set('title', request.body.title)
    formData.set('x', request.body.x)
    formData.set('y', request.body.y)
    formData.set('z', request.body.z)
    if('description' in request.body){
        formData.set('description', request.body.description)
    }
    
    const code = nanoid(10)
    formData.set('code',code)
    formData.append('pic',new Blob([request.file.buffer]), code + request.file.originalname)
    

    // Cargar datos
    const createdRecord = await pb.collection(collections.cubephotosDBName).create(formData);
    

    response.json({
        message : 'created',
        body : {
            createdRecord, 
        }
    })
})

app.get('/api/cubephoto',async (request,response) => {
    // Obtener datos
    const cubephotos = await pb.collection(collections.cubephotosDBName).getFullList(undefined,{sort: '-updated'})
    
    response.json({
        body : {
            cubephotos :  cubephotos.map((cubephoto) =>{
                const { code ,pic, ...rest } = cubephoto
                return {
                    ...rest,
                    pic : `${process.env.POCKETBASE_SERVER}/api/files/${collections.cubephotosDBName}/${rest.id}/${pic}`
                }
            })
        }
    })
})

app.get('/api/cubephoto/:id_cubephoto', async (request, response) =>{

    const id_cubephoto = request.params.id_cubephoto

    try{
        const cubephoto = await pb.collection(collections.cubephotosDBName).getOne(id_cubephoto, { expand: 'relField1,relField2.subRelField'});
        const { code ,pic , ...rest} = cubephoto
        
        response.json({
            body : {
                cubephoto : {
                    ...rest,
                    pic : `${process.env.POCKETBASE_SERVER}/api/files/${collections.cubephotosDBName}/${rest.id}/${pic}`
                }
            }
        })
    }catch(error){
        response.status(error.status).json({message: error.data.message})
        return
    }
})

app.delete('/api/cubephoto/:id_cubephoto', async (request, response) => {
    const id_cubephoto = request.params.id_cubephoto
    const code_cubephoto = request.query.code 
    const cubephoto = await pb.collection(collections.cubephotosDBName).getOne(id_cubephoto, { expand: 'relField1,relField2.subRelField'});

    try {
        if(!('code' in request.query) || cubephoto.code !== code_cubephoto ){
            throw new Error('El codigo no existe o no es invalido para eliminar')
        }
        await pb.collection(collections.cubephotosDBName).delete(id_cubephoto);
        response.status(200).json({message: 'Eliminado con exito'})
    } catch(error) {
        response.status(401).json({message: error.message});
    }
}); 

const port = process.env.PORT || 8080
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
