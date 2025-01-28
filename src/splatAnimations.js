import * as SPLAT from "../dist";

const canvas = document.querySelector("canvas");

const scene = new SPLAT.Scene();
const camera = new SPLAT.Camera();
const renderer = new SPLAT.WebGLRenderer(canvas);
const controls = new SPLAT.OrbitControls(camera, canvas);
const input = document.querySelector("input");
const loadInfo = document.getElementById('load-info')

// camera.position = new SPLAT.Vector3(0, 0, 0)

const frameRate = 32;
const wait = async () => {
  const delay = (1 / frameRate) * 1000
  return new Promise((resolve) => {
    setTimeout(
      () => resolve(),
      delay,
    );
  });
};

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function rotateModel(model, angle) {
    const axis = new SPLAT.Vector3(0, 1, 0);
  
    // const quaternionRotation = new ThreeQuaternion(
    //   model.rotation.x,
    //   model.rotation.y,
    //   model.rotation.z,
    //   model.rotation.w
    // );

    const q = SPLAT.Quaternion.FromAxisAngle(axis, angle)
  
    // quaternionRotation.setFromAxisAngle(axis, angle);
  
    model.rotation = model.rotation.multiply(q);
  };

window.onclick = () => {
    console.log('camera :>> ', camera.position)
    console.log('camera.viewMatrix :>> ', JSON.stringify(camera.data.viewMatrix.buffer))
    console.log('camera.viewProj :>> ', JSON.stringify(camera.data.viewProj.buffer))
    // console.log('camera. ')
}

input.onchange = async (e) => {
  const splatList = [];

  input.style.display = 'none'
  loadInfo.style.display = 'block'

  for (const file of e.target.files) {
    const splat = await LoadFromFileAsync(file);
    console.log('splat :>> ', splat)

    splatList.push(splat);  
    loadInfo.innerText = `Загружено файлов ${splatList.length} из ${e.target.files.length}`
  }

  const reloadButton = document.createElement('button')
  reloadButton.innerText = 'СБРОСИТЬ'
  reloadButton.onclick = () => window.location.reload();
  loadInfo.innerText = ''
  loadInfo.append(reloadButton)

  const origin = splatList.shift()

  console.log('origin :>> ', origin)
  console.log('origin._data :>> ', origin._data)

  const runAnim = async () => {
    scene.addObject(origin);

    camera.data.viewMatrix.buffer = [-0.9987330618880432,0.012353498038010367,-0.04878178120937134,0,-8.673617379884035e-19,0.9693989733671164,0.2454905913365739,0,0.050321676161810235,0.24517956995028276,-0.9681708048620659,0,0.030340623242999944,0.152589237471342,1.067520001558076,1]

    camera.update()

    // return

    for (const splat of splatList) {
        await wait();
        console.log('splat.data._positions :>> ', splat.data._positions)

        origin._data._colors = splat.data._colors
        origin._data._positions = splat.data._positions
        origin._data._rotations = splat.data._rotations
        origin._data._scales = splat.data._scales

        // origin.position = new SPLAT.Vector3(
        //   origin.position.x + 0.001,
        //   origin.position.y,
        //   origin.position.z
        // )

        // origin._updateMatrix()

        // origin.positionChanged = true
        // origin.colorTransformChanged = true

        origin._data.changed = true
        renderer._renderProgram._renderData.markDirty(origin)
    }

    scene.reset()

    // runAnim();
  };

  main();
  // runAnim();
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


