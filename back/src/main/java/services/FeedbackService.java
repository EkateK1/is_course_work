package services;

import db.FeedbackDAO;
import dto.FeedbackCreationRequest;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import model.entities.Feedback;

import java.util.List;

@RequestScoped
public class FeedbackService {

    @Inject
    FeedbackDAO feedbackDAO;

    public void create(FeedbackCreationRequest feedbackData){
        feedbackDAO.insertNew(feedbackData);
    }

    public List<Feedback> getAll(){
        return feedbackDAO.getAll();
    }

    public List<Feedback> getForEmployee(Long id){
        return feedbackDAO.getForEmployee(id);
    }
}
