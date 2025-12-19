package validation;

import db.FeedbackDAO;
import dto.FeedbackCreationRequest;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;

@RequestScoped
public class FeedbackValidation {

    @Inject
    FeedbackDAO feedbackDAO;

    public String validate(FeedbackCreationRequest feedback){
        String result = "";
        result += validateTableNumber(feedback);
        result += validateRating(feedback);
        result += validateTipAmount(feedback);
        return result;
    }

    private String validateTableNumber(FeedbackCreationRequest feedback){
        if (feedback.tableNumber == null){
            return "Отсутствует номер стола\n";
        }
        return "";
    }

    private String validateRating(FeedbackCreationRequest feedback){
        if (feedback.rating == null){
            return "Отсутствует рейтинг\n";
        }
        if (feedback.rating < 1 || feedback.rating > 5){
            return "Рейтинг должен принимать значение от 1 до 5\n";
        }
        return "";
    }

    private String validateTipAmount(FeedbackCreationRequest feedback){
        if (feedback.getTipAmount() != null && feedback.tipAmount.intValue() < 0){
            return "Значение чаевых отсутствует или меньше нуля\n";
        }
        return "";
    }
}
