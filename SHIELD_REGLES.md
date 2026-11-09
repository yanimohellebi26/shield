# Shield — Règles détaillées de la variante maison

**Version :** 0.1 — transcription consolidée du 7 novembre 2026.  
**Statut :** règles décrites par le joueur, complétées par ses réponses dans cette conversation. Les points encore inconnus sont signalés.  
**Objet :** document de référence pour comprendre et finaliser les règles avant une éventuelle adaptation jouable.

Ce document décrit votre variante de Shield avec un paquet de 52 cartes. Les précisions les plus récentes priment sur la première description, notamment sur l’ordre du tour : **le joueur choisit son action avant de piocher**.

Les mentions suivantes permettent de distinguer les niveaux de certitude :

- **Confirmé** : indiqué explicitement par le joueur.
- **Déduit** : conséquence directe d’une règle confirmée ou de son calcul.
- **Lecture à confirmer** : interprétation plausible d’une formulation, sans validation explicite.
- **Non précisé** : aucun choix n’est fixé dans ce document.

## 1. Vue d’ensemble

Les éléments suivants sont confirmés :

1. On utilise un paquet de **52 cartes**.
2. Chaque joueur reçoit **2 cartes de vie face visible**. Leurs valeurs s’additionnent pour former ses HP de départ.
3. Chaque joueur reçoit **1 carte bouclier face cachée**, inconnue de tous, y compris de son propriétaire.
4. À son tour, le joueur **choisit son action, puis pioche une carte** pour cette action.
5. Les choix décrits sont : **attaquer**, **charger**, **changer son bouclier** ou **changer le bouclier d’un autre joueur**.
6. Charger permet d’ajouter la carte mise en charge à celle d’un tour suivant pour attaquer. La description initiale vise le **prochain tour** ; les reports et charges successives restent à préciser.
7. La charge reste **face cachée pour tout le monde jusqu’à l’attaque**.
8. Lorsqu’un joueur est attaqué, son bouclier est révélé. Il **reste ensuite en jeu, face visible**.
9. Si l’attaque dépasse le bouclier, la cible perd **attaque − bouclier** HP.
10. Sous le seuil de **5 HP**, un joueur peut demander une carte pour remplacer sa vie ; l’engagement est irrévocable avant de voir la carte, sauf dans le cas suivant.
11. À **exactement 1 HP**, le joueur peut voir la carte de remplacement avant de décider s’il l’accepte.
12. Le remplacement de vie est limité à **une fois dans la partie** et se fait **en plus de l’action normale**. La portée individuelle de cette limite et le traitement d’un refus à 1 HP sont détaillés plus bas.

## 2. Matériel et valeur des cartes

### 2.1 Le paquet

Un paquet standard de 52 cartes comprend quatre enseignes : cœur, carreau, trèfle et pique, avec 13 cartes dans chacune. Les jokers ne font pas partie de ces 52 cartes. Cette composition est confirmée par le document pédagogique [Introduction to Playing Cards — Project Maths Development Team](https://www.projectmaths.ie/documents/T%26L/IntroductionToPlayingCards.pdf), page imprimée 1, troisième page du PDF.

**Aucun effet lié aux enseignes, aux couleurs rouge/noir ou à des cartes spéciales n’a été décrit.** Leur attribuer un pouvoir constituerait un ajout de règle.

### 2.2 Barème

| Carte | Valeur | Statut |
|---|---:|---|
| As | 1 | Confirmé |
| 2 à 10 | Valeur imprimée : 2 à 10 | Lecture naturelle du barème numérique |
| Valet | 11 | Confirmé |
| Dame | 12 | Confirmé |
| Roi | 13 | Confirmé |

Les calculs de ce document utilisent ce barème pour la vie, les attaques, les charges et les boucliers. Aucune valeur différente selon l’usage de la carte n’a été indiquée.

### 2.3 Vocabulaire

| Terme | Signification |
|---|---|
| HP ou points de vie | Quantité de vie actuelle d’un joueur. |
| Bouclier ou shield | Carte de défense du joueur, dont la valeur réduit les dégâts de l’attaque. |
| Charge | Carte conservée face cachée pour augmenter une attaque ultérieure. |
| Pioche | Réserve de cartes dans laquelle on tire les nouvelles cartes. |
| Carte du tour | Carte tirée après avoir choisi son action. |
| Remplacement de vie | Possibilité exceptionnelle de remplacer sa vie par une nouvelle carte. |

## 3. Mise en place

Pour chaque joueur :

1. Distribuer **deux cartes de vie face visible**.
2. Additionner leurs valeurs pour déterminer ses HP initiaux.
3. Distribuer **un bouclier face cachée**. Personne ne regarde cette carte, même son propriétaire.

Exemple : une Dame et un 7 donnent **12 + 7 = 19 HP**.

Avec le barème ci-dessus, les HP de départ vont de **2 à 26**. Il est donc possible de commencer avec moins de 5 HP ; le droit d’utiliser immédiatement le remplacement de vie devra être précisé.

La description de cette variante prévoit **trois cartes installées par joueur** : deux pour la vie et une pour le bouclier. Elle ne prévoit pas de main initiale de trois cartes.

**Lecture à confirmer :** les cartes restantes constituent une pioche commune. Dans cette organisation, il reste `52 − 3 × nombre de joueurs` cartes après la distribution, soit **46 cartes pour deux joueurs**. Ce calcul n’établit pas un nombre maximal de joueurs autorisé.

**Non précisé :** le nombre de participants admis, le choix du premier joueur, le sens de jeu, la procédure de mélange et l’ordre exact de distribution.

## 4. Déroulement d’un tour

### 4.1 Ordre confirmé

1. **Choisir son action avant de voir la carte à piocher.**
2. **Piocher une carte pour cette action.**
3. **Résoudre l’action choisie**, en respectant les informations cachées.

Le choix porte sur les quatre possibilités suivantes :

| Action | Utilisation de la carte piochée |
|---|---|
| Attaquer | Elle sert à l’attaque, avec la charge utilisable s’il y en a une. |
| Charger | Elle rejoint la charge et reste face cachée pour tous. |
| Changer son bouclier | Elle devient son nouveau bouclier. |
| Changer le bouclier d’un autre joueur | Elle devient le nouveau bouclier du joueur visé. |

La première description parlait de « 3 actions » tout en énumérant quatre choix. On peut les ranger en trois familles — attaquer, charger, changer un bouclier — avec deux cibles possibles pour la dernière famille. La précision ultérieure décrit **une action choisie par tour**, pas trois actions successives.

**Déduit :** on ne pioche pas d’abord pour décider ensuite d’attaquer avec une bonne carte ou de donner une mauvaise carte comme bouclier à un adversaire. L’action est déjà choisie.

### 4.2 Moment de désigner la cible

Le choix de l’action avant la pioche est confirmé. En revanche, le moment où il faut désigner **quel adversaire** sera attaqué ou recevra un nouveau bouclier n’est pas encore précisé. Il faut fixer ce point pour les parties à plus de deux joueurs.

Le remplacement de vie peut s’ajouter à l’action normale lorsqu’il est autorisé. Sa position exacte dans le tour reste ouverte ; voir la section 8.

## 5. Attaquer et calculer les dégâts

### 5.1 Résolution

Pour résoudre une attaque :

1. Utiliser la carte piochée pour l’action « attaquer ».
2. Révéler la charge utilisée pour cette attaque, s’il y en a une.
3. Révéler le bouclier de la cible s’il est encore face cachée.
4. Calculer la force de l’attaque et la comparer à la valeur du bouclier.
5. Retirer les dégâts obtenus aux HP de la cible.
6. Laisser le bouclier de la cible **en jeu, face visible**.

L’ordre relatif de révélation de l’attaque et du bouclier n’a pas été détaillé. Il ne doit pas donner le droit de changer rétroactivement l’action choisie.

### 5.2 Formules

Sans charge : **attaque = valeur de la carte piochée**.

Dans le cas explicitement décrit d’une carte chargée ajoutée à la carte du tour : **attaque = valeur de la charge + valeur de la carte piochée**.

La règle de dégâts se formalise ainsi :

**Dégâts = max(0, attaque − bouclier).**

**HP après l’attaque = HP avant l’attaque − dégâts.**

Cette formule a trois conséquences :

- Attaque supérieure au bouclier : la différence est retirée aux HP.
- Attaque égale au bouclier : **0 dégât**.
- Attaque inférieure au bouclier : **0 dégât** ; la différence négative ne rend pas de vie.

La soustraction peut aboutir à 0 HP ou à un résultat négatif. Les règles d’élimination et d’éventuel dernier recours doivent encore être fixées ; aucune résurrection automatique n’est établie.

### 5.3 Exemples chiffrés

| Situation | Attaque | Bouclier | HP avant | Dégâts | Résultat arithmétique |
|---|---:|---:|---:|---:|---:|
| Attaque simple avec un 10 | 10 | 6 | 18 | 4 | 14 HP |
| Égalité | 8 | 8 | 14 | 0 | 14 HP |
| Bouclier plus fort | 3 | 9 | 14 | 0 | 14 HP |
| Charge de 7, puis Roi pour attaquer | 20 | 12 | 16 | 8 | 8 HP |
| Charge de 4, puis 8 pour attaquer | 12 | 9 | 4 | 3 | 1 HP |
| Attaque dépassant la vie restante | 13 | 5 | 6 | 8 | −2 HP ; suite à préciser |

Ces exemples illustrent les calculs. Ils ne définissent pas le devenir des cartes d’attaque et de charge après leur utilisation.

## 6. Charger

### 6.1 Ce qui est confirmé

Le joueur choisit « charger », puis pioche la carte destinée à cette charge.

La charge reste **face cachée jusqu’à l’attaque, pour tous les joueurs, y compris celui qui l’a constituée**. Elle n’est donc pas une carte que son propriétaire consulte secrètement.

La description initiale indique que la carte chargée s’additionne à celle du **prochain tour** pour renforcer l’attaque.

Exemple : une carte chargée de valeur 6 et une carte d’attaque de valeur 9 donnent une attaque de **15**. Le joueur ne découvre la valeur de la charge qu’au moment où elle est révélée pour l’attaque.

### 6.2 Ce qui reste à préciser

- Peut-on choisir « charger » plusieurs tours de suite et accumuler plusieurs cartes ?
- Après une charge, faut-il obligatoirement attaquer au prochain tour ?
- Si l’on change un bouclier au tour suivant, la charge est-elle conservée ou perdue ?
- Une attaque utilise-t-elle obligatoirement toute la charge ?
- Après l’attaque, la charge est-elle consommée et où vont ses cartes ?

La dernière réponse sur le changement de vie ne répondait pas à la question des charges successives. **Aucun cumul illimité, plafond de charge ou délai d’expiration n’est donc retenu comme règle confirmée.**

## 7. Boucliers

### 7.1 Visibilité et maintien en jeu

| Situation | État du bouclier |
|---|---|
| Bouclier reçu au départ | Face cachée, inconnu de tous. |
| Première attaque subie avec ce bouclier | Il est révélé pour résoudre l’attaque. |
| Après l’attaque | Il reste en jeu **face visible**. |
| Attaque ultérieure contre le même bouclier | Sa carte est déjà connue. |
| Nouveau bouclier obtenu par changement | Application de la règle générale : face cachée jusqu’à une attaque. |

La révélation dépend du fait d’être attaqué, pas du fait de perdre des HP : une attaque bloquée révèle aussi le bouclier.

Le maintien du bouclier après l’attaque est confirmé. **Aucune règle d’usure ou de diminution permanente de sa défense n’a été décrite.** Il reste à confirmer explicitement que sa valeur reste inchangée d’une attaque à l’autre.

### 7.2 Changer son bouclier

1. Choisir cette action avant de piocher.
2. Piocher la carte destinée au nouveau bouclier.
3. Remplacer l’ancien bouclier par cette carte, en appliquant la règle du bouclier caché.

### 7.3 Changer le bouclier d’un autre joueur

Le principe est le même, mais le nouveau bouclier est attribué au joueur visé. Il provient de la pioche ; les dernières précisions ne décrivent pas un échange des deux boucliers déjà installés.

**Déduit de l’ordre du tour et du secret du bouclier :** le joueur qui effectue le changement ne choisit pas cette action après avoir vérifié la qualité de la carte et ne regarde pas le nouveau bouclier avant de le donner.

**Non précisé :** la destination de l’ancien bouclier et sa visibilité lorsqu’il quitte le jeu. Ces choix influencent les informations disponibles et les futures pioches.

La limitation à un seul changement dans la partie a été formulée à propos de **la vie**. Elle ne doit pas être appliquée automatiquement aux changements de bouclier.

## 8. Remplacer sa vie

### 8.1 Conditions générales

La description initiale permet de demander une nouvelle carte pour remplacer sa vie lorsqu’on a **moins de 5 HP**.

La précision ultérieure est formulée « avoir -5 de vie ». **Lecture retenue au vu du premier message : cela signifie “moins de 5 HP”, soit HP < 5, et non atteindre −5 HP.** Cette interprétation reste signalée pour éviter une confusion sur le seuil.

Le joueur a ensuite précisé deux éléments :

- Le changement de vie est limité à **une seule fois sur toute la partie**.
- Il se fait **en plus de l’action normale**, et ne la remplace donc pas.

**Lecture à confirmer :** chaque joueur possède sa propre possibilité de remplacement. Une limite partagée entre tous les joueurs n’a pas été décrite.

### 8.2 À 2, 3 ou 4 HP : engagement avant de voir

Le joueur peut décider de remplacer sa vie. S’il s’engage, il est obligé d’accepter la nouvelle carte, même si elle lui donne moins de vie qu’avant.

L’ordre est donc : **décision irrévocable → pioche → découverte et application de la nouvelle vie**.

**Lecture du mot “remplacer” :** la valeur de la carte devient le nouveau total de HP, soit **HP nouveaux = valeur de la carte**. Elle n’est pas ajoutée aux HP restants. Cette interprétation doit être validée si vous utilisez un autre mode de remplacement des deux cartes de vie.

Exemple : à 4 HP, accepter le remplacement puis tirer un 2 donne **2 HP**, selon cette lecture. Le joueur ne peut pas revenir à ses 4 HP.

### 8.3 À exactement 1 HP : voir avant de décider

Le joueur peut voir la carte tirée avant de décider s’il remplace sa vie.

- S’il accepte, la carte devient sa nouvelle vie.
- S’il refuse, il conserve son HP actuel, soit **1 HP**.

Exemple : à 1 HP, une Dame proposée permet de passer à **12 HP** si le joueur accepte.

**Non précisé :** un refus consomme-t-il l’unique possibilité de la partie ? La limite concerne-t-elle une tentative de pioche ou seulement un remplacement effectivement accepté ? Où va la carte refusée ?

Ces questions doivent être tranchées pour savoir si l’on peut tenter à nouveau plus tard. Aucun droit à repiocher jusqu’à obtenir une bonne carte n’est établi.

### 8.4 Tableau des seuils

| HP actuels | Application de la règle décrite |
|---|---|
| 5 ou plus | Pas de remplacement au titre du seuil « moins de 5 ». |
| 2, 3 ou 4 | Remplacement possible si le droit est encore disponible ; engagement avant de voir. |
| Exactement 1 | Possibilité de voir la carte avant d’accepter. |
| 0 ou moins | Non précisé : il faut définir l’élimination et la priorité éventuelle du remplacement. |

L’exception à 1 HP ne supprime pas explicitement la limite d’une utilisation par partie. Elle modifie le moment de la décision.

### 8.5 Moment et représentation du remplacement

Le remplacement est confirmé comme **supplémentaire à l’action normale**, mais il reste à préciser :

- s’il se demande uniquement à son propre tour ou également après une attaque adverse ;
- s’il intervient avant l’action normale, après celle-ci ou à l’un ou l’autre moment ;
- si le joueur peut l’utiliser immédiatement lorsqu’il commence la partie sous 5 HP ;
- si les deux cartes de vie initiales sont remplacées matériellement par la nouvelle carte ;
- comment les cartes de vie et les HP restants sont suivis après des dégâts ;
- qui voit la carte proposée à 1 HP, et où va une carte refusée.

## 9. Informations connues et cachées

| Élément | Information disponible |
|---|---|
| Deux cartes de vie initiales | Visibles de tous. |
| HP de départ | Calculables par tous en additionnant les cartes de vie. |
| Bouclier non encore attaqué | Inconnu de tous, propriétaire compris. |
| Bouclier ayant subi une attaque | Visible de tous et maintenu en jeu. |
| Charge avant une attaque | Inconnue de tous, propriétaire compris. |
| Charge utilisée pendant l’attaque | Révélée pour calculer l’attaque. |
| Carte suivante de la pioche | Elle ne doit pas être consultée pour choisir l’action. |
| Carte proposée pour la vie à 1 HP | Visible du bénéficiaire avant sa décision ; visibilité aux autres non précisée. |
| Cartes sorties du jeu | Destination et visibilité non précisées. |

**Point d’attention pour une éventuelle version contre ordinateur :** les décisions de l’ordinateur doivent respecter ces mêmes informations. Il ne doit connaître ni sa charge cachée, ni un bouclier encore inconnu, ni la prochaine carte au moment de choisir son action. Il s’agit d’une conséquence des règles de secret, pas d’un pouvoir supplémentaire.

## 10. Fin de partie et gestion du paquet

### 10.1 Victoire et élimination

**Lecture à confirmer :** le but serait de rester le dernier joueur en vie, avec une élimination lorsque les HP atteignent 0 ou moins. Cette condition est cohérente avec les attaques, mais n’a pas été explicitement fixée pour votre variante.

Il faut notamment préciser si un coup qui fait passer directement de 6 à −2 HP élimine immédiatement le joueur, même s’il n’a pas encore utilisé son remplacement de vie.

### 10.2 Circulation des cartes

Les cartes de vie, de bouclier, de charge et d’attaque proviennent du même paquet de 52 cartes. Leur circulation doit rester cohérente : une carte installée devant un joueur ne peut pas être simultanément disponible dans la pioche.

Les règles suivantes restent ouvertes :

- Destination des cartes d’attaque et de charge après usage.
- Destination des anciens boucliers et anciennes cartes de vie.
- Destination d’une carte de vie refusée à 1 HP.
- Sort des cartes d’un joueur éliminé.
- Reconstitution éventuelle de la pioche lorsqu’elle est vide.
- Suite de la partie si aucune pioche n’est possible.

Une défausse remélangée est une solution possible, mais **elle n’a pas été confirmée** et n’est pas adoptée automatiquement ici.

## 11. Points restant à trancher

Ce tableau rassemble les questions qui empêchent encore d’obtenir un règlement entièrement déterminé.

| Nº | Sujet | Décision manquante |
|---|---|---|
| 1 | Charge successive | Peut-on charger plusieurs tours de suite ? Si oui, jusqu’à quelle limite ? |
| 2 | Tour suivant une charge | L’attaque est-elle obligatoire ? Sinon, que devient la charge ? |
| 3 | Utilisation de la charge | Toute la charge doit-elle être utilisée ? Est-elle consommée après l’attaque ? |
| 4 | Valeur du bouclier après attaque | Reste-t-elle identique, sans usure ? Le maintien face visible est déjà confirmé. |
| 5 | Choix de la cible | Faut-il désigner l’adversaire avant la pioche ? |
| 6 | Fenêtre du remplacement de vie | Seulement à son tour ? Avant ou après son action ? Également après une attaque adverse ? |
| 7 | Limite du remplacement | Confirmer une possibilité par joueur ; préciser si un refus à 1 HP consomme ce droit. |
| 8 | Effet et suivi de la vie | Confirmer que la nouvelle carte fixe le total de HP et préciser le devenir des cartes de vie. |
| 9 | Mort et victoire | Fixer l’élimination, la victoire et le traitement d’un joueur tombé à 0 HP ou moins. |
| 10 | Défausse et pioche vide | Fixer la destination des cartes sorties du jeu et la façon de continuer sans pioche. |
| 11 | Organisation de la partie | Nombre de joueurs, premier joueur, sens de jeu et distribution. |
| 12 | Informations publiques | Visibilité des HP courants, des cartes retirées et d’une carte de vie refusée. |

Le seuil « moins de 5 HP », le barème des cartes numériques et la pioche commune sont interprétés comme expliqué dans les sections correspondantes. Aucune réponse à ces questions n’est empruntée automatiquement à un autre jeu nommé Shield.

## 12. Sources et fiabilité

### 12.1 Source principale : les explications du joueur

La première source est la description de la variante dans la conversation [Jeu de cartes Shield](chatgpt-conversation://6aeb2e06-e0b4-83ed-b222-7335517404fd), complétée par les précisions données ici le **7 novembre 2026**.

Les précisions ajoutées dans cette conversation sont :

- As = 1, Valet = 11, Dame = 12 et Roi = 13.
- Le bouclier reste en jeu et face visible après une attaque.
- Le nouveau bouclier provient de la pioche.
- L’action est décidée **avant** de piocher.
- La charge reste cachée à tous jusqu’à l’attaque.
- Les deux cartes de vie s’additionnent.
- Le remplacement de vie ne peut être utilisé qu’une fois dans la partie et s’ajoute à l’action normale.

Ces explications font référence pour **votre variante maison**. Elles ne constituent pas la preuve d’un règlement officiel ou universel de Shield.

### 12.2 Référence fiable sur le matériel

Le document [Teaching & Learning Plan 5: Introduction to Playing Cards — Project Maths Development Team](https://www.projectmaths.ie/documents/T%26L/IntroductionToPlayingCards.pdf), daté de 2009 dans le PDF, décrit le paquet de 52 cartes et ses quatre enseignes, hors jokers. Il sert uniquement à documenter le matériel ; il ne traite pas des règles de Shield. Consulté le 7 novembre 2026.

### 12.3 Piste sur un jeu appelé Shield, non validée comme règlement

Le message [A card game called shield? Similar to wizard? — r/cardgames](https://www.reddit.com/r/cardgames/comments/ruh5h0/a_card_game_called_shield_similar_to_wizard/), publié le 2 janvier 2022, décrit de mémoire un jeu avec trois cartes de bouclier, trois de vie et trois en main. Son auteur reconnaît ses incertitudes ; les boucliers y sont décrits comme visibles dès le départ. Consulté le 7 novembre 2026.

**Fiabilité pour établir vos règles : insuffisante.** Ce témoignage est une piste sur le nom du jeu, pas une validation de votre variante. Il ne permet pas de confirmer la charge, le seuil de remplacement de vie ou le secret du bouclier que vous décrivez.

### 12.4 Résultat de la recherche

Les recherches menées en français et en anglais le 7 novembre 2026 n’ont pas permis d’identifier un règlement d’auteur ou d’éditeur fiable correspondant exactement à cette combinaison de règles. Cela ne prouve pas qu’un tel document n’existe pas.

Les jeux partageant un vocabulaire d’attaque, de vie ou de bouclier ne sont pas utilisés pour combler les règles manquantes. Les sources externes ci-dessus ont une portée limitée, explicitée pour chacune.

### 12.5 Ancien fichier HTML

Le fichier précédemment mentionné, `/mnt/data/shield-duel.html`, n’est pas présent dans l’environnement accessible au moment de la rédaction. Son contenu n’a donc pas été examiné. La conversation antérieure le présentait comme une adaptation proposée de la version à trois boucliers, trois vies et trois cartes en main ; il ne sert pas de source de règles pour la présente variante.

## 13. Suivi des précisions

| Étape | Précision conservée |
|---|---|
| Description initiale | 52 cartes ; deux vies visibles ; un bouclier secret ; attaque, charge et changement de bouclier ; dégâts par différence ; remplacement sous 5 HP ; exception à 1 HP. |
| Première précision | Valeurs de l’As et des figures ; bouclier conservé après attaque ; remplacement du bouclier par la pioche. |
| Deuxième précision | Roi = 13 ; bouclier conservé visible ; choix de l’action avant la pioche ; charge secrète pour tous jusqu’à l’attaque. |
| Troisième précision | Vie initiale obtenue par addition ; remplacement de vie une seule fois dans la partie, en plus de l’action normale. |

Ce fichier constitue la transcription des règles connues et de leurs limites actuelles. Les décisions restantes pourront être ajoutées à ce document sans commencer la programmation du jeu.

## 14. Décisions du 8 novembre 2026

### 14.1 Tranchées par le joueur

| Nº | Sujet | Décision |
|---|---|---|
| 1–3 | Charge | On peut charger plusieurs tours de suite, **sans limite**. Toutes les cartes chargées s’ajoutent à la prochaine attaque, puis partent à la défausse. La charge est conservée si l’on fait une autre action entre-temps. |
| 9 | Mort et victoire | À **0 HP ou moins**, le joueur est **éliminé immédiatement**, même s’il n’a pas utilisé son remplacement de vie. Le dernier joueur en vie gagne. |
| 10 | Défausse et pioche vide | Les cartes utilisées vont **face visible dans une défausse**. Quand la pioche est vide, la défausse est **mélangée pour former une nouvelle pioche**. |
| 6–7 | Remplacement de vie | Uniquement **au début de son propre tour, avant l’action normale**, une fois par joueur et par partie. À 1 HP, **refuser la carte consomme quand même** ce droit. |
| 11 | Nombre de joueurs | **2 à 8 joueurs.** |
| — | Un seul bouclier | Chaque joueur a **un seul bouclier** à la fois, face cachée tant qu'il n'a pas été attaqué, face visible ensuite. |
| 1–3 | Charge empilée et secrète | Les cartes de charge sont **empilées** en une seule pile. Personne, propriétaire compris, ne connaît la charge avant que son propriétaire frappe. |
| — | Charge menacée (révisée après l'étude d'équilibrage, `docs/EQUILIBRAGE.md`) | Si un joueur qui a une charge **subit des dégâts** (l'attaque dépasse son bouclier), il **perd toute sa charge** (cartes à la défausse, face visible), quelle que soit sa valeur. Si le bouclier bloque tout (0 dégât), la charge n'est pas menacée. *Règle précédente, abandonnée : perte seulement si l'attaque dépassait la charge ; elle rendait l'accumulation de charges dominante.* |
| — | Nombre de paquets | **1 paquet de 52 cartes de 2 à 4 joueurs, 2 paquets mélangés (104 cartes) de 5 à 8 joueurs.** Avec un seul paquet, à 8 joueurs, 26 % des cartes révélées avaient déjà été vues dans la partie ; avec deux, presque aucune. |
| — | Partie à deux joueurs | Le joueur qui joue **en second commence avec 3 HP de plus** (compense l'avantage du premier joueur : 55–57 % de victoires sans bonus, 51–52 % avec). |

### 14.2 Valeurs par défaut proposées (modifiables)

| Nº | Sujet | Défaut retenu pour le développement |
|---|---|---|
| 4 | Bouclier | Sa valeur reste identique après chaque attaque (aucune usure). |
| 5 | Cible | La cible (attaque ou changement de bouclier adverse) est désignée **avant** la pioche, avec l’action. |
| 8 | Suivi de la vie | Le remplacement fixe les HP à la valeur de la carte ; les anciennes cartes de vie partent à la défausse. Un joueur qui commence sous 5 HP peut l’utiliser dès son premier tour. |
| 10 | Autres cartes | Ancien bouclier, carte refusée à 1 HP et cartes d’un joueur éliminé (vie, bouclier, charge) vont à la défausse, face visible. |
| 11 | Organisation | Premier joueur tiré au hasard, sens horaire. |
| 12 | Informations publiques | HP courants, défausse et carte refusée sont visibles de tous. |
