import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { db, collection, addDoc, getDocs } from './firebase.js';

const contenedor = document.getElementById('contenedor-3d');
const ancho = window.innerWidth;
const alto = window.innerHeight;

const escena = new THREE.Scene();
escena.background = new THREE.Color(0x1a1a2e);

const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
escena.add(luzAmbiente);

const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
luzDireccional.position.set(5, 10, 7);
escena.add(luzDireccional);

const camara = new THREE.PerspectiveCamera(60, ancho / alto, 0.1, 1000);
camara.position.set(3, 2, 5);
camara.lookAt(0, 0, 0);

const renderizador = new THREE.WebGLRenderer({ antialias: true });
renderizador.setSize(ancho, alto);
renderizador.setPixelRatio(window.devicePixelRatio);
renderizador.shadowMap.enabled = true;
contenedor.appendChild(renderizador.domElement);

const loader = new GLTFLoader();
let pastel = null;
const velas = {};
const fuegos = {};
let modeloCargado = false;

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotationVelocity = { x: 0, y: 0 };
const damping = 0.95;

function puedeLeerMensajes() {
    const ahora = new Date();
    return ahora.getMonth() > 8 || (ahora.getMonth() === 8 && ahora.getDate() >= 9);
}

function crearFuego(vela, index) {
    vela.updateWorldMatrix(true, true);
    const bbox = new THREE.Box3().setFromObject(vela);
    const posicionSuperior = new THREE.Vector3(
        (bbox.min.x + bbox.max.x) / 2,
        bbox.max.y + 0.05,
        (bbox.min.z + bbox.max.z) / 2
    );

    const geometriaFuego = new THREE.SphereGeometry(0.06, 8, 8);
    const materialFuego = new THREE.MeshStandardMaterial({
        color: 0xff8800,
        emissive: 0xff4400,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.9
    });

    const fuego = new THREE.Mesh(geometriaFuego, materialFuego);
    fuego.name = `fuego_${index}`;
    fuego.position.copy(posicionSuperior);
    escena.add(fuego);

    fuegos[index] = fuego;

    console.log(`Fuego creado para vela ${index}`);
    return fuego;
}

function actualizarFuegos() {
    Object.keys(velas).forEach(index => {
        const vela = velas[index];
        const fuego = fuegos[index];
        if (vela && fuego) {
            vela.updateWorldMatrix(true, true);
            const bbox = new THREE.Box3().setFromObject(vela);
            fuego.position.set(
                (bbox.min.x + bbox.max.x) / 2,
                bbox.max.y + 0.05,
                (bbox.min.z + bbox.max.z) / 2
            );
        }
    });
}

loader.load(
    'modelos/torta.glb',
    function (gltf) {
        pastel = gltf.scene;
        escena.add(pastel);
        modeloCargado = true;

        const box = new THREE.Box3().setFromObject(pastel);
        const centro = box.getCenter(new THREE.Vector3());
        const tamaño = box.getSize(new THREE.Vector3());
        const mayorDimension = Math.max(tamaño.x, tamaño.y, tamaño.z);
        pastel.position.sub(centro);

        const distancia = mayorDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)));
        camara.position.set(distancia * 0.8, distancia * 0.5, distancia * 1.2);
        camara.near = Math.max(0.01, distancia / 100);
        camara.far = distancia * 100;
        camara.updateProjectionMatrix();
        camara.lookAt(0, 0, 0);

        let velasEncontradas = 0;
        for (let i = 1; i <= 5; i++) {
            const nombreVela = `vela_${i}`;
            const vela = pastel.getObjectByName(nombreVela);
            if (vela) {
                velas[i] = vela;
                velasEncontradas++;
                console.log(`Vela ${i} encontrada`);
                crearFuego(vela, i);
            } else {
                console.warn(`Vela ${i} no encontrada`);
            }
        }

    },
    function (xhr) {
        console.log(`Cargando: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
    },
    function (error) {
        console.error('Error:', error);
    }
);

function onMouseDown(event) {
    if (event.button === 0) {
        isDragging = true;
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

function onMouseMove(event) {
    if (!isDragging || !pastel) return;

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    pastel.rotation.y += deltaX * 0.01;
    pastel.rotation.x += deltaY * 0.01;

    pastel.rotation.x = Math.max(-1, Math.min(1, pastel.rotation.x));

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };

    actualizarFuegos();
}

function onMouseUp(event) {
    if (event.button === 0) {
        isDragging = false;
    }
}

document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mouseup', onMouseUp);

document.addEventListener('touchstart', function (event) {
    const touch = event.touches[0];
    if (touch) {
        isDragging = true;
        previousMousePosition = {
            x: touch.clientX,
            y: touch.clientY
        };
    }
});

document.addEventListener('touchmove', function (event) {
    if (!isDragging || !pastel) return;
    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - previousMousePosition.x;
    const deltaY = touch.clientY - previousMousePosition.y;

    pastel.rotation.y += deltaX * 0.01;
    pastel.rotation.x += deltaY * 0.01;
    pastel.rotation.x = Math.max(-1, Math.min(1, pastel.rotation.x));

    previousMousePosition = {
        x: touch.clientX,
        y: touch.clientY
    };

    actualizarFuegos();
});

document.addEventListener('touchend', function () {
    isDragging = false;
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let clickTimeout = false;

function onClick(event) {
    if (isDragging) return;
    if (clickTimeout) return;

    clickTimeout = true;
    setTimeout(() => { clickTimeout = false; }, 300);

    const rect = renderizador.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camara);

    const objetosVela = Object.values(velas).filter(v => v !== undefined);
    if (objetosVela.length === 0) {
        mostrarMensajeTemporal('No hay velas');
        return;
    }

    const intersects = raycaster.intersectObjects(objetosVela, true);

    if (intersects.length > 0) {
        const objetoImpactado = intersects[0].object;
        let velaClickeada = objetoImpactado;
        while (velaClickeada && !objetosVela.includes(velaClickeada)) {
            velaClickeada = velaClickeada.parent;
        }
        if (!velaClickeada) return;

        console.log(`Clic en: ${velaClickeada.name}`);

        const colores = [
            0xff6b6b, 0xffa500, 0xffd93d, 0x6bcb77,
            0x4d96ff, 0x9b59b6, 0xff69b4, 0x00b894,
            0xe17055, 0x0984e3, 0xfdcb6e, 0x00cec9
        ];
        const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];

        const materiales = Array.isArray(objetoImpactado.material)
            ? objetoImpactado.material
            : [objetoImpactado.material];
        materiales.filter(Boolean).forEach(mat => {
            mat.color.setHex(colorAleatorio);
        });

        const index = Object.keys(velas).find(key => velas[key] === velaClickeada);
        if (index && fuegos[index]) {
            const fuego = fuegos[index];
            fuego.material.color.setHex(colorAleatorio);
            fuego.material.emissive.setHex(colorAleatorio);
        }

        mostrarPanelGrabacion();
        if (puedeLeerMensajes()) {
            document.getElementById('btn-soplar').style.display = 'block';
        }
        
    } else {
        mostrarMensajeTemporal('Haz clic en una vela');
    }
}

document.addEventListener('click', onClick);

function mostrarPanelGrabacion() {
    const panel = document.getElementById('panel-grabacion');
    if (panel) {
        panel.style.display = 'block';
        const instrucciones = document.getElementById('panel-instrucciones');
        if (instrucciones) {
            instrucciones.style.display = 'none';
        }
    }
}

function ocultarPanelGrabacion() {
    const panel = document.getElementById('panel-grabacion');
    if (panel) {
        panel.style.display = 'none';
        const instrucciones = document.getElementById('panel-instrucciones');
        if (instrucciones) {
            instrucciones.style.display = 'block';
        }
    }
}

document.getElementById('btn-cerrar-grabacion')?.addEventListener('click', ocultarPanelGrabacion);

function mostrarMensajeTemporal(texto) {
    const panel = document.getElementById('panel-instrucciones');
    if (!panel) return;
    const p = panel.querySelector('p');
    if (p) {
        p.textContent = texto;
        panel.style.background = 'rgba(0,0,0,0.85)';
        panel.style.display = 'block';
        clearTimeout(p._timeout);
        p._timeout = setTimeout(() => {
            p.textContent = 'Haz clic en una vela';
            panel.style.background = 'rgba(0,0,0,0.7)';
        }, 3000);
    }
}

document.getElementById('btn-enviar-texto')?.addEventListener('click', async function () {
    const nombre = document.getElementById('input-nombre')?.value || 'Anónimo';
    const mensaje = document.getElementById('input-mensaje')?.value;

    if (!mensaje || mensaje.trim() === '') {
        
        return;
    }

    const guardado = await guardarMensajeTexto(nombre, mensaje);

    if (guardado) {
        mostrarMensajeTemporal(`¡Mensaje guardado de ${nombre}!`);
        document.getElementById('input-nombre').value = '';
        document.getElementById('input-mensaje').value = '';

        setTimeout(() => {
            ocultarPanelGrabacion();
        }, 1500);
    } else {
        mostrarMensajeTemporal('Error al guardar.');
    }
});

let mediaRecorder = null;
let audioChunks = [];

/* document.getElementById('btn-grabar-voz')?.addEventListener('click', async function () {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        this.textContent = 'Grabar voz';
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Audio grabado:', audioUrl);

            const audio = new Audio(audioUrl);
            audio.controls = true;
            audio.style.position = 'fixed';
            audio.style.bottom = '100px';
            audio.style.left = '50%';
            audio.style.transform = 'translateX(-50%)';
            audio.style.zIndex = '1000';
            audio.style.background = '#1a1a2e';
            audio.style.padding = '10px';
            audio.style.borderRadius = '10px';
            audio.style.border = '2px solid #ffa500';
            document.body.appendChild(audio);

            setTimeout(() => {
                audio.remove();
            }, 30000);

            mostrarMensajeTemporal('¡Audio grabado! Puedes escucharlo abajo');
            document.getElementById('btn-grabar-voz').textContent = 'Grabar voz';
        };

        mediaRecorder.start();
        this.textContent = '⏹️ Detener';
        mostrarMensajeTemporal('Grabando...');

    } catch (error) {
        console.error('Error al acceder al micrófono:', error);
        alert('No se pudo acceder al micrófono. Permite el acceso en el navegador.');
    }
}); */

window.addEventListener('resize', () => {
    const newAncho = window.innerWidth;
    const newAlto = window.innerHeight;
    camara.aspect = newAncho / newAlto;
    camara.updateProjectionMatrix();
    renderizador.setSize(newAncho, newAlto);
});

function animate() {
    requestAnimationFrame(animate);

    Object.values(fuegos).forEach(fuego => {
        if (fuego && fuego.material) {
            const intensidad = 1.8 + Math.sin(Date.now() / 150 + fuego.id) * 0.8;
            fuego.material.emissiveIntensity = intensidad;
            const scale = 1 + Math.sin(Date.now() / 100 + fuego.id) * 0.05;
            fuego.scale.set(scale, scale, scale);
        }
    });

    renderizador.render(escena, camara);
}


async function guardarMensajeTexto(nombre, mensaje) {
    try {
        await addDoc(collection(db, 'mensajes'), {
            nombre: nombre,
            mensaje: mensaje,
            tipo: 'texto',
            fecha: new Date().toISOString()
        });
        console.log('Mensaje de texto guardado');
        return true;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

async function leerMensajes() {
    try {
        const querySnapshot = await getDocs(collection(db, 'mensajes'));
        return querySnapshot.docs
            .map((documento) => documento.data())
            .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
    } catch (error) {
        console.error('Error al leer mensajes:', error);
        mostrarMensajeTemporal('No se pudieron leer los mensajes');
        return [];
    }
}

function mostrarMensajesEnPanel(mensajes) {
    const contenedor = document.getElementById('contenedor-mensajes');
    contenedor.innerHTML = '';

    if (mensajes.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color:#999;">No hay mensajes aún 😢</p>';
        return;
    }

    mensajes.forEach((data) => {
        const div = document.createElement('div');
        div.className = 'mensaje';

        const nombre = document.createElement('div');
        nombre.className = 'nombre';
        nombre.textContent = data.nombre || 'Anónimo';
        div.appendChild(nombre);

        if (data.mensaje) {
            const texto = document.createElement('p');
            texto.textContent = data.mensaje;
            div.appendChild(texto);
        }

        contenedor.appendChild(div);
    });
}

let globosActivos = [];
let intervaloGlobos = null;

function crearGlobo(mensajeData) {
    const globo = document.createElement('div');
    globo.className = 'globo-mensaje';
    
    const nombre = document.createElement('div');
    nombre.className = 'globo-nombre';
    nombre.textContent = mensajeData.nombre || 'Anónimo';
    
    const texto = document.createElement('div');
    texto.className = 'globo-texto';
    texto.textContent = mensajeData.mensaje || '✨';
    
    globo.appendChild(nombre);
    globo.appendChild(texto);
    
    const anchoVentana = window.innerWidth;
    const altoVentana = window.innerHeight;
    const x = Math.random() * (anchoVentana - 200) + 100;
    const y = altoVentana + 50;
    
    globo.style.left = x + 'px';
    globo.style.bottom = '-100px';
    
    const scale = 0.8 + Math.random() * 0.6;
    globo.style.transform = `scale(${scale})`;
    
    const colores = [
        '#ff6b6b', '#ffa500', '#ffd93d', '#6bcb77', 
        '#4d96ff', '#9b59b6', '#ff69b4', '#00b894',
        '#fd79a8', '#a29bfe', '#fdcb6e', '#00cec9'
    ];
    const color = colores[Math.floor(Math.random() * colores.length)];
    globo.style.setProperty('--globo-color', color);
    
    document.body.appendChild(globo);
    globosActivos.push(globo);
    
    const duracion = 7000 + Math.random() * 5000;
    const altura = 200 + Math.random() * 300;
    
    globo.animate([
        { 
            transform: `scale(${scale}) translateY(0)`,
            opacity: 0,
            bottom: '-100px'
        },
        { 
            transform: `scale(${scale}) translateY(${-altura}px)`,
            opacity: 1,
            bottom: '0px'
        },
        { 
            transform: `scale(${scale * 0.9}) translateY(${-altura - 100}px)`,
            opacity: 0,
            bottom: '0px'
        }
    ], {
        duration: duracion,
        easing: 'ease-out'
    }).onfinish = () => {
        globo.remove();
        globosActivos = globosActivos.filter(g => g !== globo);
    };
}

function mostrarGlobos(mensajes) {
    globosActivos.forEach(globo => globo.remove());
    globosActivos = [];
    if (intervaloGlobos) {
        clearInterval(intervaloGlobos);
        intervaloGlobos = null;
    }
    
    if (mensajes.length === 0) {
        crearGlobo({ nombre: '-', mensaje: 'No hay mensajes aún' });
        return;
    }
    
    let index = 0;
    
    function lanzarGlobo() {
        if (index < mensajes.length) {
            crearGlobo(mensajes[index]);
            index++;
        } else {
            index = 0;
            setTimeout(() => {
                if (intervaloGlobos) {
                    lanzarGlobo();
                }
            }, 1000);
        }
    }
    
    lanzarGlobo();
    intervaloGlobos = setInterval(lanzarGlobo, 1200 + Math.random() * 800);
}

function apagarVelas() {
    Object.keys(fuegos).forEach(index => {
        const fuego = fuegos[index];
        if (fuego) {
            fuego.material.opacity = 0;
            fuego.material.transparent = true;
            fuego.material.emissiveIntensity = 0;
        }
    });
}

document.getElementById('btn-soplar')?.addEventListener('click', async function () {
    if (!puedeLeerMensajes()) {
        this.style.display = 'none';
        return;
    }

    apagarVelas();

    const mensajes = await leerMensajes();

    mostrarGlobos(mensajes);

    document.getElementById('panel-mensajes').style.display = 'block';

    this.style.display = 'none';

    document.getElementById('panel-instrucciones').style.display = 'none';
});

document.getElementById('btn-cerrar-mensajes')?.addEventListener('click', function () {
    globosActivos.forEach(globo => globo.remove());
    globosActivos = [];
    if (intervaloGlobos) {
        clearInterval(intervaloGlobos);
        intervaloGlobos = null;
    }
    document.getElementById('panel-mensajes').style.display = 'none';
    document.getElementById('panel-instrucciones').style.display = 'block';
});

window.addEventListener('resize', () => {
});

document.addEventListener('DOMContentLoaded', function () {
    const btnVoz = document.getElementById('btn-grabar-voz');
    if (btnVoz) {
        btnVoz.style.display = 'none';
    }

    const btnSoplar = document.getElementById('btn-soplar');
    if (btnSoplar && !puedeLeerMensajes()) {
        btnSoplar.style.display = 'none';
    }
});

animate();
