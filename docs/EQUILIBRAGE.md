# Équilibrage de SHIELD — rapport du 8 novembre 2026

Méthode : simulations du moteur de règles (`npm run balance -w @shield/engine`), 800 à 1 500 parties par configuration.
« smart » = le bot du jeu. Les stratégies testées voient seulement ce qu'un joueur a le droit de voir.

## Règles actuelles

| | 2 joueurs | 4 joueurs | 8 joueurs |
|---|---|---|---|
| Durée médiane (tours de table) | 3,5 | 5,3 | 6,3 |
| Durée médiane (tours au total) | 7 | 22 | 50 |
| Victoires du premier joueur (part équitable) | **55–57 %** (50 %) | 26 % (25 %) | 13 % (12,5 %) |
| Actions : charger / attaquer / boucliers | 54 % / 38 % / 8 % | 53 % / 40 % / 7 % | 52 % / 41 % / 7 % |

- Attaques bloquées : environ 18 %. Dégâts moyens par attaque : 7.
- Aucune partie bloquée sur des milliers ; le remélange de la défausse n'arrive qu'à 6–8 joueurs.
- **Réfléchir paie** : jouer au hasard gagne 14 % au lieu de 50 % à 2 joueurs.

## Problèmes constatés

1. **La charge domine.** Le bouclier ne se soustrait qu'une fois par attaque, donc combiner des cartes est presque toujours meilleur. « Charger 1 à 3 cartes puis attaquer » vaut le bot ; « attaquer sans charger » tombe à 21 %. Changer un bouclier ne sert presque jamais (7 % des actions).
2. **À 2 joueurs, le premier joueur a un avantage** (55–57 %). Au-delà de 3 joueurs, toutes les places sont équitables.

## Variantes testées

| Variante | Effet |
|---|---|
| Charge limitée à 2 ou 3 cartes | Presque aucun effet : la charge reste dominante. |
| **Charge perdue dès qu'on prend des dégâts** | Accumuler devient risqué (charger 4 cartes : 10 % de victoires). Les stratégies défensives remontent (29 % → 35 %), attaquer sans charger aussi (21 % → 25 %). Plus de diversité. Parties légèrement plus longues. |
| Pas d'attaque au tour 1 | Ne corrige pas l'avantage du premier joueur (56 %). |
| 2 joueurs : le second commence avec 1 carte en charge | Trop fort : le premier joueur tombe à 39,5 %. |
| **2 joueurs : le second commence avec +3 HP** | Équilibré : 51 % pour le premier joueur. Parties 2 joueurs un peu plus longues (4,5 tours de table). |
| 2 joueurs : +4 HP | 49 % pour le premier joueur. |

## Recommandations (à valider par l'auteur du jeu)

1. **Charge perdue sur tout coup qui fait des dégâts** (au lieu de « si l'attaque dépasse la charge ») : casse la stratégie dominante et rend le bouclier plus important.
2. **À 2 joueurs, +3 HP pour le second joueur.**

Les deux variantes sont déjà dans le moteur (`rules: { chargeLoss: 'anyDamage', secondPlayerHp: 3 }`), désactivées par défaut.
Après décision, le bot devra être réajusté à la nouvelle règle de charge.

## Décisions (8 novembre 2026)

L'auteur a retenu les deux recommandations, devenues les règles par défaut du moteur :
- charge perdue sur tout coup qui fait des dégâts ;
- à 2 joueurs, +3 HP pour le second joueur.

Résultats avec ces règles et le bot réajusté (1 200 parties par mesure) :
- 2 joueurs : 4,5 tours de table, premier joueur 51,8 %.
- Le meilleur rythme devient « charger une fois puis frapper » ; empiler 2 cartes ou plus fait tomber à 10–23 % de victoires.
- Actions sur les boucliers : 9 % (contre 7 %).
