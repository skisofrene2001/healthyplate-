import React from 'react';
import { getMealImage } from '../utils/foodImages';

export default function MealCard({ meal, onClick, showCalories = true }) {
  const typeClass = meal.type?.replace('é', 'e').replace('î', 'i') || 'dejeuner';
  
  return (
    <div className="explore-card" onClick={() => onClick(meal)}>
      <div className="explore-img-wrapper">
        <img src={getMealImage(meal.nom, meal.type)} alt={meal.nom} className="explore-img" />
      </div>
      <div className="explore-info">
        <div className="explore-title">{meal.nom}</div>
        <div className="explore-stats">
          <span>🍽️ {meal.type}</span>
          <span style={{fontWeight: 700, color: 'var(--g6)'}}>💰 {meal.cout} DA</span>
        </div>
        {showCalories && meal.calories && (
          <div style={{display:'flex', gap:12, fontSize: 11, marginTop: 4, color: 'var(--g5)', fontWeight: 600}}>
            <span>🔥 {meal.calories} kcal</span>
            {meal.proteines && <span>🍗 {meal.proteines}g Prot.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
