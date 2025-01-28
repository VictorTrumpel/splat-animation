import * as SPLAT from "gsplat";

export class SplatLoader {

  onLoad = () => null

  constructor() {
    const input = document.querySelector("input");
    const loadInfo = document.getElementById('load-info')

    input.onchange = async (e) => {
      input.style.display = 'none'
      loadInfo.style.display = 'block'

      const file = e.target.files[0]
    
      const splat = await LoadFromFileAsync(file);

      this.onLoad(splat)
    }
  }
}

async function LoadFromFileAsync(file, onProgress) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (mainResolve) => {
      const reader = new FileReader();

      let splat = new SPLAT.Splat();

      reader.onload = (e) => {
          splat = LoadFromArrayBuffer(e.target.result);
          mainResolve(splat);
      };

      reader.onprogress = (e) => {
          onProgress?.(e.loaded / e.total);
      };

      reader.readAsArrayBuffer(file);

      await new Promise((resolve) => {
          reader.onloadend = () => {
              resolve();
          };
      });

      return splat;
  });
}

function LoadFromArrayBuffer(arrayBuffer) {
  const buffer = new Uint8Array(arrayBuffer);
  const data = Deserialize(buffer);
  const splat = new SPLAT.Splat(data);
  return splat;
}

function Deserialize(data) {
  const vertexCount = data.length / SPLAT.SplatData.RowLength;
  const positions = new Float32Array(3 * vertexCount);
  const rotations = new Float32Array(4 * vertexCount);
  const scales = new Float32Array(3 * vertexCount);
  const colors = new Uint8Array(4 * vertexCount);

  const f_buffer = new Float32Array(data.buffer);
  const u_buffer = new Uint8Array(data.buffer);

  for (let i = 0; i < vertexCount; i++) {
      positions[3 * i + 0] = f_buffer[8 * i + 0];
      positions[3 * i + 1] = f_buffer[8 * i + 1];
      positions[3 * i + 2] = f_buffer[8 * i + 2];

      rotations[4 * i + 0] = (u_buffer[32 * i + 28 + 0] - 128) / 128;
      rotations[4 * i + 1] = (u_buffer[32 * i + 28 + 1] - 128) / 128;
      rotations[4 * i + 2] = (u_buffer[32 * i + 28 + 2] - 128) / 128;
      rotations[4 * i + 3] = (u_buffer[32 * i + 28 + 3] - 128) / 128;

      scales[3 * i + 0] = f_buffer[8 * i + 3 + 0];
      scales[3 * i + 1] = f_buffer[8 * i + 3 + 1];
      scales[3 * i + 2] = f_buffer[8 * i + 3 + 2];

      colors[4 * i + 0] = u_buffer[32 * i + 24 + 0];
      colors[4 * i + 1] = u_buffer[32 * i + 24 + 1];
      colors[4 * i + 2] = u_buffer[32 * i + 24 + 2];
      colors[4 * i + 3] = u_buffer[32 * i + 24 + 3];
  }

  return new SPLAT.SplatData(vertexCount, positions, rotations, scales, colors);
}