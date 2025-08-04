'use client';
import { useState } from 'react';

export function ArtifactUploader({ campaignId }:{campaignId:string}){
  const[file,setFile]=useState<File|null>(null);
  const[status,setStatus]=useState('');
  
  async function upload(){
    if(!file)return;
    setStatus('Requesting URL...');
    const r=await fetch('/api/artifacts/signed-url',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fileName:file.name,contentType:file.type,campaignId})
    });
    const {url,key}=await r.json();
    setStatus('Uploading...');
    const put=await fetch(url,{
      method:'PUT',
      headers:{'Content-Type':file.type},
      body:file
    });
    setStatus(put.ok?'Uploaded: '+key:'Upload failed');
  }
  
  return(
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Upload Artifacts</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose file
          </label>
          <input 
            type="file" 
            onChange={e=>setFile(e.target.files?.[0]||null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand file:text-white hover:file:bg-brand-dark"
          />
        </div>
        <button 
          className="btn" 
          onClick={upload} 
          disabled={!file}
        >
          Upload
        </button>
        {status && (
          <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}