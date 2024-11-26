import * as SPLAT from "gsplat";

const canvas = document.querySelector("canvas");

const scene = new SPLAT.Scene();
const camera = new SPLAT.Camera();
const renderer = new SPLAT.WebGLRenderer(canvas, null);
const controls = new SPLAT.OrbitControls(camera, canvas);
const input = document.querySelector("input");
const loadInfo = document.getElementById('load-info')

console.log('renderer :>> ', renderer)
console.log('scene :>> ', scene)

const frameRate = 30;
const wait = async () => {
  const delay = (1 / frameRate) * 1000
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(),
      delay,
    );
  });
};

input.onchange = async (e) => {
  const splatList = [];

  input.style.display = 'none'
  loadInfo.style.display = 'block'

  for (const file of e.target.files) {
    const splat = await LoadFromFileAsync(file);
    splatList.push(splat);  
    loadInfo.innerText = `Загружено файлов ${splatList.length} из ${e.target.files.length}`
  }

  const reloadButton = document.createElement('button')
  reloadButton.innerText = 'СБРОСИТЬ'
  reloadButton.onclick = () => window.location.reload();
  loadInfo.innerText = ''
  loadInfo.append(reloadButton)

  console.log('splatList :>> ', splatList)

  const runAnim = async () => {
    const origin = splatList.shift()
    scene.addObject(origin);

    for (const splat of splatList) {
        await wait();
        origin._data = splat.data
        origin._data.changed = true
        renderer._renderProgram._renderData.markDirty(origin)
    }

    scene.removeObject(origin)

    runAnim();
  };

  runAnim();
  main();
};

async function main() {
    const handleResize = () => {
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };

    const frame = () => {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    requestAnimationFrame(frame);
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


