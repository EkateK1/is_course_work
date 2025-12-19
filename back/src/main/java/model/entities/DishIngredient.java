package model.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table (name = "dish_ingredient")
@Getter
@Setter
public class DishIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "id_dish", nullable = false)
    private Dish dish;

    @ManyToOne
    @JoinColumn(name = "id_ingredient", nullable = false)
    private Ingredient ingredient;

    @Positive
    @Column(name = "amount", precision = 14, scale = 3, nullable = false)
    private BigDecimal amount;
}
