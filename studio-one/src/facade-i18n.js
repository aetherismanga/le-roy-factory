// Register Studio One's facade controls before the shared UI dictionary is
// snapshotted. The catalogue and persisted settings remain language-neutral.
import {ES_COMMERCE,ES_COMMERCE_PATTERNS} from '../../shared/lrf-3d/i18n/es-commerce.js';

Object.assign(ES_COMMERCE,{
 'Façade du meuble':'Frente del mueble',
 'Façade encastrée':'Frente enrasado',
 'Façade standard':'Frente estándar',
 'Type de façade non reconnu.':'Tipo de frente no reconocido.',
 'Chants gauche et droit visibles de 19 mm, dans la finition du meuble.':'Cantos izquierdo y derecho visibles de 19 mm, con el acabado del mueble.',
 'chants latéraux de 19 mm':'cantos laterales de 19 mm',
 'Déverrouillez le meuble pour changer sa façade.':'Desbloquea el mueble para cambiar su frente.'
});
ES_COMMERCE_PATTERNS.unshift(
 [/^Dessin coté STUDIO ONE (.+), hauteur totale ([\d.,]+) cm(.*), profondeur 46 cm(?:, largeur ([\d.,]+) cm)?, façade encastrée, chants latéraux de 19 mm$/u,(_m,name,height,detail,width)=>`Plano acotado STUDIO ONE ${ES_COMMERCE[name]??name}, altura total ${height} cm${detail.replace('caisson','casco').replace('pieds','patas').replace(' et ',' y ')}, fondo 46 cm${width?', anchura '+width+' cm':''}, frente enrasado, cantos laterales de 19 mm`]
);
