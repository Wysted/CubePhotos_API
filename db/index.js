import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv'

dotenv.config()

const pb = new PocketBase(process.env.POCKETBASE_SERVER);


const adminData = await pb.admins.authWithPassword(process.env.CORREO,process.env.PASSWORD);



export default pb
