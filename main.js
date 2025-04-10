"use strict";

function parseOBJ(text) {
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];
  const objVertexData = [objPositions, objTexcoords, objNormals];
  const webglVertexData = [[], [], []];

  function addVertex(vert) {
    const ptn = vert.split("/");
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) return;
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });  
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
  };

  const lines = text.split("\n");
  const keywordRE = /(\w*)(?: )*(.*)/;

  for (let line of lines) {
    line = line.trim();
    if (line === "" || line.startsWith("#")) continue;

    const match = keywordRE.exec(line);
    if (!match) continue;

    const [, keyword, unparsedArgs] = match;
    const parts = unparsedArgs.split(/\s+/);
    const handler = keywords[keyword];

    if (!handler) {
      console.warn("Palavra-chave não tratada:", keyword);
      continue;
    }
    handler(parts);
  }

  return {
    position: webglVertexData[0],
    texcoord: webglVertexData[1],
    normal: webglVertexData[2],
  };
}

function createIdentityMatrix() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

function createTranslationMatrix(tx, ty, tz) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1
  ];
}

function createScaleMatrix(sx, sy, sz) {
  return [
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1
  ];
}

function createRotationXMatrix(angleInRadians) {
  const c = Math.cos(angleInRadians);
  const s = Math.sin(angleInRadians);
  return [
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ];
}

function createRotationYMatrix(angleInRadians) {
  const c = Math.cos(angleInRadians);
  const s = Math.sin(angleInRadians);
  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ];
}

function createRotationZMatrix(angleInRadians) {
  const c = Math.cos(angleInRadians);
  const s = Math.sin(angleInRadians);
  return [
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

function multiplyMatrices(a, b) {
  const result = [];
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      let sum = 0;
      for (let k = 0; k < 4; ++k) {
        sum += a[i * 4 + k] * b[k * 4 + j];
      }
      result[i * 4 + j] = sum;
    }
  }
  return result;
}

async function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("Seu navegador não suporta WebGL2.");
    return;
  }

  function adjustCanvasSize() {
    const canvasContainer = document.querySelector("#canvas-container");
    const canvasWidth = canvasContainer.clientWidth;
    const canvasHeight = canvasContainer.clientHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  adjustCanvasSize();
  window.addEventListener('resize', adjustCanvasSize);

  const vs = `#version 300 es
  in vec4 a_position;
  in vec3 a_normal;
  in vec2 a_texcoord;
  
  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  
  out vec3 v_normal;
  out vec2 v_texcoord;

  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_normal = mat3(u_world) * a_normal;
    v_texcoord = a_texcoord;
  }
  `;

  const fs = `#version 300 es
  precision highp float;
  
  in vec3 v_normal;
  in vec2 v_texcoord;
  
  uniform vec4 u_diffuse;
  uniform vec3 u_lightDirection;
  uniform sampler2D u_texture;
  uniform bool u_useTexture;
  
  out vec4 outColor;

  void main () {
    vec3 normal = normalize(v_normal);
    float light = dot(u_lightDirection, normal) * 0.5 + 0.5;
    
    if (u_useTexture) {
      vec4 texColor = texture(u_texture, v_texcoord);
      outColor = vec4(texColor.rgb * light, texColor.a);
    } else {
      outColor = vec4(u_diffuse.rgb * light, u_diffuse.a);
    }
  }
  `;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vs);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('Erro ao compilar vertex shader:', gl.getShaderInfoLog(vertexShader));
    return;
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fs);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('Erro ao compilar fragment shader:', gl.getShaderInfoLog(fragmentShader));
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Erro ao linkar programa:', gl.getProgramInfoLog(program));
    return;
  }

  const meshProgramInfo = {
    program: program,
    attribLocations: {
      position: gl.getAttribLocation(program, 'a_position'),
      normal: gl.getAttribLocation(program, 'a_normal'),
      texcoord: gl.getAttribLocation(program, 'a_texcoord'),
    },
    uniformLocations: {
      projection: gl.getUniformLocation(program, 'u_projection'),
      view: gl.getUniformLocation(program, 'u_view'),
      world: gl.getUniformLocation(program, 'u_world'),
      diffuse: gl.getUniformLocation(program, 'u_diffuse'),
      lightDirection: gl.getUniformLocation(program, 'u_lightDirection'),
      texture: gl.getUniformLocation(program, 'u_texture'),
      useTexture: gl.getUniformLocation(program, 'u_useTexture'),
    },
  };

  async function loadFixedModel(modelName, position, rotation, scale) {
    try {
      const response = await fetch(`Models/${modelName}`);
      const text = await response.text();
      const data = parseOBJ(text);
  
      if (data.position.length === 0) {
        console.error("O modelo fixo não contém vértices válidos.");
        return;
      }
  
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.position), gl.STATIC_DRAW);
  
      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normal), gl.STATIC_DRAW);
  
      const texcoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.texcoord), gl.STATIC_DRAW);
  
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(meshProgramInfo.attribLocations.position);
      gl.vertexAttribPointer(meshProgramInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.enableVertexAttribArray(meshProgramInfo.attribLocations.normal);
      gl.vertexAttribPointer(meshProgramInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
      gl.enableVertexAttribArray(meshProgramInfo.attribLocations.texcoord);
      gl.vertexAttribPointer(meshProgramInfo.attribLocations.texcoord, 2, gl.FLOAT, false, 0, 0);
  
      const texture = createTexture(gl);
  
      const fixedModel = {
        name: modelName,
        vao,
        numElements: data.position.length / 3,
        texture,
        transform: {
          translation: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          scale: scale
        }
      };
  
      fixedModels.push(fixedModel);
      console.log(`Modelo fixo ${modelName} adicionado na posição (${position.x}, ${position.y}, ${position.z})`);
    } catch (error) {
      console.error("Erro ao carregar modelo fixo:", error);
    }
  }
  

  let models = [];
  let fixedModels = [];
  let selectedModelId = null;
  let nextModelId = 0;
  let cameraPosition = [5, 4, 5];

  function createTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([100, 0, 0, 255]));
    
    return texture;
  }


  function updateModelSelector() {
    const selector = document.getElementById("model-selector") || createModelSelector();
    selector.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Selecione um modelo...";
    defaultOption.disabled = true;
    defaultOption.selected = !selectedModelId;
    selector.appendChild(defaultOption);

    models.forEach(model => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = `${model.name} (ID: ${model.id})`;
        option.selected = model.id === selectedModelId;
        selector.appendChild(option);
    });
  }

  function createTextureSelector() {
    const controlsDiv = document.querySelector("#controls");
    
    const textureContainer = document.createElement("div");
    textureContainer.className = "control-group";
    
    const label = document.createElement("label");
    label.textContent = "Textura:";
    textureContainer.appendChild(label);
    
    const textureInput = document.createElement("input");
    textureInput.type = "file";
    textureInput.id = "texture-input";
    textureInput.accept = "image/*";
    
    textureInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && selectedModelId !== null) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const image = new Image();
          image.src = e.target.result;
          image.onload = function() {
            const model = models.find(m => m.id === selectedModelId);
            if (model) {
              gl.bindTexture(gl.TEXTURE_2D, model.texture);
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
              gl.generateMipmap(gl.TEXTURE_2D);
              model.useTexture = true;
            }
          };
        };
        reader.readAsDataURL(file);
      }
    });
    
    textureContainer.appendChild(textureInput);
    
    const textureCheckbox = document.createElement("input");
    textureCheckbox.type = "checkbox";
    textureCheckbox.id = "texture-enabled";
    
    const checkboxLabel = document.createElement("label");
    checkboxLabel.htmlFor = "texture-enabled";
    checkboxLabel.textContent = "Usar Textura";
    
    textureCheckbox.addEventListener("change", (e) => {
      if (selectedModelId !== null) {
        const model = models.find(m => m.id === selectedModelId);
        if (model) {
          model.useTexture = e.target.checked;
        }
      }
    });
    
    const checkboxContainer = document.createElement("div");
    checkboxContainer.appendChild(textureCheckbox);
    checkboxContainer.appendChild(checkboxLabel);
    textureContainer.appendChild(checkboxContainer);
    
    controlsDiv.appendChild(textureContainer);
  }

  function createModelSelector() {
    const controlsDiv = document.querySelector("#controls");
    
    const selectorContainer = document.createElement("div");
    selectorContainer.className = "control-group";
    
    const label = document.createElement("label");
    label.textContent = "Modelo Selecionado:";
    selectorContainer.appendChild(label);
    
    const selector = document.createElement("select");
    selector.id = "model-selector";
    selector.className = "model-selector";
    
    selector.addEventListener("change", (e) => {
        if (e.target.value) {
            selectedModelId = parseInt(e.target.value);
            
            const selectedModel = models.find(m => m.id === selectedModelId);
            if (selectedModel) {
                console.log("Modelo selecionado:", selectedModel.name, "ID:", selectedModelId);
                
                document.getElementById("translate-x").value = selectedModel.transform.translation.x;
                document.getElementById("translate-y").value = selectedModel.transform.translation.y;
                document.getElementById("translate-z").value = selectedModel.transform.translation.z;
                document.getElementById("rotate-x").value = selectedModel.transform.rotation.x * 180 / Math.PI;
                document.getElementById("rotate-y").value = selectedModel.transform.rotation.y * 180 / Math.PI;
                document.getElementById("rotate-z").value = selectedModel.transform.rotation.z * 180 / Math.PI;
                document.getElementById("scale").value = selectedModel.transform.scale;
                document.getElementById("texture-enabled").checked = selectedModel.useTexture;
            }
        }
    });
    
    selectorContainer.appendChild(selector);
    controlsDiv.insertBefore(selectorContainer, controlsDiv.firstChild);
    
    return selector;
  }

  async function loadModel(modelName) {
    try {
      const response = await fetch(`Models/${modelName}`);
      const text = await response.text();
      const data = parseOBJ(text);

      if (data.position.length === 0) {
        console.error("O modelo não contém vértices válidos.");
        return;
      }

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.position), gl.STATIC_DRAW);

      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normal), gl.STATIC_DRAW);

      const texcoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.texcoord), gl.STATIC_DRAW);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(meshProgramInfo.attribLocations.position);
      gl.vertexAttribPointer(meshProgramInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.enableVertexAttribArray(meshProgramInfo.attribLocations.normal);
      gl.vertexAttribPointer(meshProgramInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
      gl.enableVertexAttribArray(meshProgramInfo.attribLocations.texcoord);
      gl.vertexAttribPointer(meshProgramInfo.attribLocations.texcoord, 2, gl.FLOAT, false, 0, 0);

      const texture = createTexture(gl);

      const modelId = nextModelId++;
      const model = {
        id: modelId,
        name: modelName,
        positionBuffer,
        normalBuffer,
        texcoordBuffer,
        texture,
        useTexture: false,
        vao,
        numElements: data.position.length / 3,
        transform: {
          translation: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1
        }
      };

      models.push(model);
      selectedModelId = model.id;
      
      updateModelSelector();
      updateUIForSelectedModel();

      console.log(`Modelo ${modelName} (ID: ${model.id}) adicionado à cena.`);
    } catch (error) {
      console.error("Erro ao carregar o modelo:", error);
    }
  }

  function updateUIForSelectedModel() {
    const model = models.find(m => m.id === selectedModelId);
    if (!model) return;

    document.getElementById("translate-x").value = model.transform.translation.x;
    document.getElementById("translate-y").value = model.transform.translation.y;
    document.getElementById("translate-z").value = model.transform.translation.z;
    document.getElementById("rotate-x").value = model.transform.rotation.x * 180 / Math.PI;
    document.getElementById("rotate-y").value = model.transform.rotation.y * 180 / Math.PI;
    document.getElementById("rotate-z").value = model.transform.rotation.z * 180 / Math.PI;
    document.getElementById("scale").value = model.transform.scale;
    document.getElementById("texture-enabled").checked = model.useTexture;

    updateModelSelector();
  }

  function render() {
    adjustCanvasSize();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const fieldOfViewRadians = Math.PI * 0.6;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100;
    const projection = createPerspectiveMatrix(fieldOfViewRadians, aspect, zNear, zFar);

    const cameraTarget = [0, 0, 0];
    const up = [0, 1, 0];
    const camera = createLookAtMatrix(cameraPosition, cameraTarget, up);
    const view = createInverseMatrix(camera);

    const sharedUniforms = {
      u_lightDirection: normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
    };

    fixedModels.forEach(model => {
      gl.bindVertexArray(model.vao);
  
      const translation = createTranslationMatrix(
        model.transform.translation.x,
        model.transform.translation.y,
        model.transform.translation.z
      );
      const scaling = createScaleMatrix(
        model.transform.scale,
        model.transform.scale,
        model.transform.scale
      );
      const rotationX = createRotationXMatrix(model.transform.rotation.x);
      const rotationY = createRotationYMatrix(model.transform.rotation.y);
      const rotationZ = createRotationZMatrix(model.transform.rotation.z);
  
      let worldMatrix = createIdentityMatrix();
      worldMatrix = multiplyMatrices(worldMatrix, scaling);
      worldMatrix = multiplyMatrices(worldMatrix, rotationX);
      worldMatrix = multiplyMatrices(worldMatrix, rotationY);
      worldMatrix = multiplyMatrices(worldMatrix, rotationZ);
      worldMatrix = multiplyMatrices(worldMatrix, translation);
  
      gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.world, false, worldMatrix);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, model.texture);
      gl.uniform1i(meshProgramInfo.uniformLocations.texture, 0);
      gl.uniform1i(meshProgramInfo.uniformLocations.useTexture, true);
  
      gl.uniform4fv(meshProgramInfo.uniformLocations.diffuse, [0.7, 0.7, 0.7, 1]);
      
      gl.drawArrays(gl.TRIANGLES, 0, model.numElements);
    });

    gl.useProgram(meshProgramInfo.program);
    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.projection, false, projection);
    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.view, false, view);
    gl.uniform3fv(meshProgramInfo.uniformLocations.lightDirection, sharedUniforms.u_lightDirection);

    models.forEach(model => {
      gl.bindVertexArray(model.vao);

      const translation = createTranslationMatrix(
        model.transform.translation.x,
        model.transform.translation.y,
        model.transform.translation.z
      );
      const scaling = createScaleMatrix(
        model.transform.scale,
        model.transform.scale,
        model.transform.scale
      );
      const rotationX = createRotationXMatrix(model.transform.rotation.x);
      const rotationY = createRotationYMatrix(model.transform.rotation.y);
      const rotationZ = createRotationZMatrix(model.transform.rotation.z);

      let worldMatrix = createIdentityMatrix();
      worldMatrix = multiplyMatrices(worldMatrix, scaling);
      worldMatrix = multiplyMatrices(worldMatrix, rotationX);
      worldMatrix = multiplyMatrices(worldMatrix, rotationY);
      worldMatrix = multiplyMatrices(worldMatrix, rotationZ);
      worldMatrix = multiplyMatrices(worldMatrix, translation);

      gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.world, false, worldMatrix);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, model.texture);
      gl.uniform1i(meshProgramInfo.uniformLocations.texture, 0);
      gl.uniform1i(meshProgramInfo.uniformLocations.useTexture, model.useTexture);

      const color = model.id === selectedModelId ? [1, 0.7, 0.5, 1] : [0.7, 0.7, 0.7, 1];
      gl.uniform4fv(meshProgramInfo.uniformLocations.diffuse, color);
      
      gl.drawArrays(gl.TRIANGLES, 0, model.numElements);
    });

    requestAnimationFrame(render);
  }

  function setupTransformListeners() {
    const updateModelTransform = () => {
      const model = models.find(m => m.id === selectedModelId);
      if (!model) return;

      model.transform.translation.x = parseFloat(document.getElementById("translate-x").value);
      model.transform.translation.y = parseFloat(document.getElementById("translate-y").value);
      model.transform.translation.z = parseFloat(document.getElementById("translate-z").value);
      model.transform.rotation.x = parseFloat(document.getElementById("rotate-x").value) * Math.PI / 180;
      model.transform.rotation.y = parseFloat(document.getElementById("rotate-y").value) * Math.PI / 180;
      model.transform.rotation.z = parseFloat(document.getElementById("rotate-z").value) * Math.PI / 180;
      model.transform.scale = parseFloat(document.getElementById("scale").value);
    };

    function saveScene() {
      const sceneData = {
          models: models.map(model => ({
              name: model.name,
              transform: {
                  translation: model.transform.translation,
                  rotation: model.transform.rotation,
                  scale: model.transform.scale
              },
              useTexture: model.useTexture
          })),
          fixedModels: fixedModels.map(model => ({
              name: model.name,
              transform: {
                  translation: model.transform.translation,
                  rotation: model.transform.rotation,
                  scale: model.transform.scale
              }
          }))
      };

      const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Lucas.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  }

  async function loadScene(file) {
      try {
          const text = await file.text();
          const sceneData = JSON.parse(text);

          models = [];
          selectedModelId = null;
          nextModelId = 0;

          for (const modelData of sceneData.models) {
              await loadModel(modelData.name);
              const model = models[models.length - 1];
              model.transform = modelData.transform;
              model.useTexture = modelData.useTexture;
          }

          updateModelSelector();
          if (models.length > 0) {
              selectedModelId = models[0].id;
              updateUIForSelectedModel();
          }

          console.log("Cena carregada com sucesso!");
      } catch (error) {
          console.error("Erro ao carregar a cena:", error);
      }
  }

  document.querySelector("#save-scene").addEventListener("click", saveScene);
  
  document.querySelector("#load-scene").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
          loadScene(file);
      }
  });

    const controls = [
      "translate-x", "translate-y", "translate-z",
      "rotate-x", "rotate-y", "rotate-z",
      "scale"
    ];

    controls.forEach(controlId => {
      document.getElementById(controlId).addEventListener("input", updateModelTransform);
    });
  }

  function createPerspectiveMatrix(fieldOfViewRadians, aspect, zNear, zFar) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewRadians);
    const rangeInv = 1.0 / (zNear - zFar);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (zNear + zFar) * rangeInv, -1,
      0, 0, zNear * zFar * rangeInv * 2, 0
    ];
  }

  function createLookAtMatrix(eye, target, up) {
    const zAxis = normalize(subtractVectors(eye, target));
    const xAxis = normalize(cross(up, zAxis));
    const yAxis = normalize(cross(zAxis, xAxis));

    return [
      xAxis[0], xAxis[1], xAxis[2], 0,
      yAxis[0], yAxis[1], yAxis[2], 0,
      zAxis[0], zAxis[1], zAxis[2], 0,
      eye[0], eye[1], eye[2], 1
    ];
  }

  function createInverseMatrix(m) {
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];

    const tmp_0  = m22 * m33;
    const tmp_1  = m32 * m23;
    const tmp_2  = m12 * m33;
    const tmp_3  = m32 * m13;
    const tmp_4  = m12 * m23;
    const tmp_5  = m22 * m13;
    const tmp_6  = m02 * m33;
    const tmp_7  = m32 * m03;
    const tmp_8  = m02 * m23;
    const tmp_9  = m22 * m03;
    const tmp_10 = m02 * m13;
    const tmp_11 = m12 * m03;
    const tmp_12 = m20 * m31;
    const tmp_13 = m30 * m21;
    const tmp_14 = m10 * m31;
    const tmp_15 = m30 * m11;
    const tmp_16 = m10 * m21;
    const tmp_17 = m20 * m11;
    const tmp_18 = m00 * m31;
    const tmp_19 = m30 * m01;
    const tmp_20 = m00 * m21;
    const tmp_21 = m20 * m01;
    const tmp_22 = m00 * m11;
    const tmp_23 = m10 * m01;

    const t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
               (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    const t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
               (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    const t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
               (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    const t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
               (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    const d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
           (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
           (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
           (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
           (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
           (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
           (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
           (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
           d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
                (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
           d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
                (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
           d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
                (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
           d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
                (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
           d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
                (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
         ];
       }
     
       function normalize(v) {
         const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
         return [v[0] / length, v[1] / length, v[2] / length];
       }
     
       function subtractVectors(a, b) {
         return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
       }
     
       function cross(a, b) {
         return [
           a[1] * b[2] - a[2] * b[1],
           a[2] * b[0] - a[0] * b[2],
           a[0] * b[1] - a[1] * b[0]
         ];
       }

       async function loadFixedModels(){
        await loadFixedModel("forest.obj",
          { x: -6.00, y: 6.2, z: 8.15 },
          { x: 0, y: 70, z: 0 }, 
          0.08
        );

        await loadFixedModel("castle.obj",
          { x: -8.00, y: 6.1, z: 8.98},
          { x: 0, y: 80, z: -0.2 },    
          0.07
        );

        await loadFixedModel("bridge.obj",
          { x: -8.00, y: 5.75, z: 9.23},
          { x: 0, y: 70, z: 0 },    
          0.1 
        );

        await loadFixedModel("well.obj",
          { x: -6.00, y: 5, z: 8.83},
          { x: 0, y: 70, z: 0 },    
          0.2
        );

        await loadFixedModel("house.obj",
          { x: -6.00, y: 4.5, z: 9.13},
          { x: 0, y: 70, z: 0 },    
          0.1 
        );

          
        await loadFixedModel("hex_forest.obj",
          { x: -6.00, y: 4.1, z: 9.33},
          { x: 0, y: 70, z: 0 },    
          0.07
        );

        await loadFixedModel("hex_forest_roadA.obj",
          { x: -6.00, y: 3.7, z: 9.55},
          { x: 0, y: 70, z: 0 },    
          0.07 
        );

        await loadFixedModel("hex_forest_roadB.obj",
          { x: -6.00, y: 3.2, z: 9.83},
          { x: 0, y: 70, z: 0 },    
          0.08
        );

        await loadFixedModel("square_rock.obj",
          { x: 1, y: -6, z: 1},
          { x: 0, y: 70, z: 0 },    
          6
        );


       }

      
       document.querySelector("#model1").addEventListener("click", () => loadModel("forest.obj"));
       document.querySelector("#model2").addEventListener("click", () => loadModel("castle.obj"));
       document.querySelector("#model3").addEventListener("click", () => loadModel("well.obj"));
       document.querySelector("#model4").addEventListener("click", () => loadModel("bridge.obj"));
       document.querySelector("#model6").addEventListener("click", () => loadModel("house.obj"));
       document.querySelector("#model7").addEventListener("click", () => loadModel("hex_forest_roadB.obj"));
       document.querySelector("#model8").addEventListener("click", () => loadModel("hex_forest.obj"));
       document.querySelector("#model9").addEventListener("click", () => loadModel("hex_forest_roadA.obj"));


     
       setupTransformListeners();
       createTextureSelector();
       await loadFixedModels();
       requestAnimationFrame(render);

     }
     
     main();