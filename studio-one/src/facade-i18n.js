// Register Studio One's facade controls before the shared UI dictionary is
// snapshotted. The catalogue and persisted settings remain language-neutral.
import {ES_COMMERCE,ES_COMMERCE_PATTERNS} from '../../shared/lrf-3d/i18n/es-commerce.js';

Object.assign(ES_COMMERCE,{
 'Milo double':'Milo doble',
 'Fiona double':'Fiona doble',
 'Double vasque · blanc brillant ou blanc mat':'Lavabo doble · blanco brillo o blanco mate',
 'Deux caissons de 70 cm sous un plan double vasque.':'Dos módulos de 70 cm con una encimera de doble lavabo.',
 '70 + 70 cm · un seul plan double vasque':'70 + 70 cm · una encimera de doble lavabo',
 'Choisissez de 40 à 120 cm ou 140 cm.':'Elige entre 40 y 120 cm o 140 cm.',
 'Choisissez une largeur entière de 40 à 120 cm ou la composition de 140 cm (2 × 70 cm).':'Elige entre 40 y 120 cm o una composición de 140 cm (2 × 70 cm).',
 'Le plan assorti est sélectionné pour cette largeur.':'Se ha seleccionado la encimera a juego para esta anchura.',
 'Ce plan est indisponible pour cette largeur.':'Esta encimera no está disponible para esta anchura.',
 'Façade du meuble':'Frente del mueble',
 'Façade encastrée':'Frente enrasado',
 'Façade standard':'Frente estándar',
 'Type de façade non reconnu.':'Tipo de frente no reconocido.',
 'Chants gauche et droit visibles de 19 mm, dans la finition du meuble.':'Cantos izquierdo y derecho visibles de 19 mm, con el acabado del mueble.',
 'chants latéraux de 19 mm':'cantos laterales de 19 mm',
 'Déverrouillez le meuble pour changer sa façade.':'Desbloquea el mueble para cambiar su frente.'
});
ES_COMMERCE_PATTERNS.unshift(
 [/^Solid Surface blanc mat · (.+?) cm · 2 cuves de (.+?) cm(.*)$/u,(_m,size,bowls,rest)=>`Solid Surface blanco mate · ${size} cm · 2 senos de ${bowls} cm${rest}`],
 [/^De 40 à 120 cm au centimètre\. En 140 cm, deux caissons de 70 cm\.(.*)$/u,(_m,rest)=>`De 40 a 120 cm de centímetro en centímetro. En 140 cm, dos módulos de 70 cm.${rest.replace('Hauteur','Altura').replace('profondeur','fondo')}`],
 [/^Dessin coté STUDIO ONE (.+), hauteur totale ([\d.,]+) cm(.*), profondeur 46 cm(?:, largeur ([\d.,]+) cm)?, façade encastrée, chants latéraux de 19 mm$/u,(_m,name,height,detail,width)=>`Plano acotado STUDIO ONE ${ES_COMMERCE[name]??name}, altura total ${height} cm${detail.replace('caisson','casco').replace('pieds','patas').replace(' et ',' y ')}, fondo 46 cm${width?', anchura '+width+' cm':''}, frente enrasado, cantos laterales de 19 mm`]
);
