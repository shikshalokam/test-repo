/**
 * name : observations/helper.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : Observations helper functionality.
 */

// Dependencies
const entitiesHelper = require(MODULES_BASE_PATH + "/entities/helper")
const slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const kafkaClient = require(ROOT_PATH + "/generics/helpers/kafkaCommunications");
const chunkOfObservationSubmissionsLength = 500;

/**
    * ObservationsHelper
    * @class
*/
module.exports = class ObservationsHelper {

    /**
   * Get Observation document based on filtered data provided.
   * @method
   * @name observationDocuments
   * @param {Object} [findQuery = "all"] -filter data.
   * @param {Array} [fields = "all"] - Projected fields.
   * @returns {Array} - List of observations.
   */

    static observationDocuments(findQuery = "all", fields = "all") {
        return new Promise(async (resolve, reject) => {
            try {
                let queryObject = {};

                if (findQuery != "all") {
                    queryObject = _.merge(queryObject, findQuery)
                }

                let projectionObject = {};

                if (fields != "all") {
                    fields.forEach(element => {
                        projectionObject[element] = 1;
                    });
                }

                let observationDocuments = await database.models.observations
                    .find(queryObject, projectionObject)
                    .lean();
                return resolve(observationDocuments);
            } catch (error) {
                return reject(error);
            }
        });
    }

    /**
   * Create observation.
   * @method
   * @name create
   * @param {String} solutionId -solution id.
   * @param {Object} data - Observation creation data.
   * @param {Object} data - Observation creation data. 
   * @param {Object} userDetails - Logged in user details.
   * @returns {Object} observation creation data.
   */

    static create(solutionId, data, userDetails) {
        return new Promise(async (resolve, reject) => {
            try {

                let solutionDocument = await database.models.solutions.findOne({
                    _id: ObjectId(solutionId),
                    isReusable: true
                }, {
                        _id: 1,
                        frameworkId: 1,
                        frameworkExternalId: 1,
                        externalId: 1,
                        entityTypeId: 1,
                        entityType: 1
                    }).lean();

                if (!solutionDocument) {
                    throw messageConstants.apiResponses.SOLUTION_NOT_FOUND;
                }

                if (data.entities) {
                    let entitiesToAdd = await entitiesHelper.validateEntities(data.entities, solutionDocument.entityTypeId);

                    data.entities = entitiesToAdd.entityIds;

                }

                let observationData = await database.models.observations.create(
                    _.merge(data, {
                        "solutionId": solutionDocument._id,
                        "solutionExternalId": solutionDocument.externalId,
                        "frameworkId": solutionDocument.frameworkId,
                        "frameworkExternalId": solutionDocument.frameworkExternalId,
                        "entityTypeId": solutionDocument.entityTypeId,
                        "entityType": solutionDocument.entityType,
                        "author": userDetails.id,
                        "updatedBy": userDetails.id,
                        "createdBy": userDetails.id
                    })
                );

                return resolve(_.pick(observationData, ["_id", "name", "description"]));

            } catch (error) {
                return reject(error);
            }
        })

    }


    /**
     * list observation v1.
     * @method
     * @name listV1
     * @param {String} [userId = ""] -Logged in user id.
     * @returns {Object} observation list.
     */

    static listV1(userId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if(userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID);
                }

                let observations = this.listCommon(userId, "v1");

                return resolve(observations);

            } catch (error) {
                return reject(error);
            }
        })
    }


    /**
     * list observation v2.
     * @method
     * @name listV2
     * @param {String} [userId = ""] -Logged in user id.
     * @returns {Object} observation list.
     */

    static listV2(userId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if(userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID);
                }

                let observations = this.listCommon(userId, "v2");

                return resolve(observations);

            } catch (error) {
                return reject(error);
            }
        })
    }


    /**
     * list observation v2.
     * @method
     * @name listV2
     * @param {String} [userId = ""] -Logged in user id.
     * @returns {Object} observation list.
     */

    static listCommon(userId = "", sourceApi = "v2") {
        return new Promise(async (resolve, reject) => {
            try {

                if(userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID);
                }

                let observations = new Array;

                let assessorObservationsQueryObject = [
                    {
                        $match: {
                            createdBy: userId,
                            status: { $ne: "inactive" }
                        }
                    },
                    {
                        $lookup: {
                            from: "entities",
                            localField: "entities",
                            foreignField: "_id",
                            as: "entityDocuments"
                        }
                    },
                    {
                        $project: {
                            "name": 1,
                            "description": 1,
                            "entities": 1,
                            "startDate": 1,
                            "endDate": 1,
                            "status": 1,
                            "solutionId": 1,
                            "entityDocuments._id": 1,
                            "entityDocuments.metaInformation.externalId": 1,
                            "entityDocuments.metaInformation.name": 1
                        }
                    }
                ];

                const userObservations = await database.models.observations.aggregate(assessorObservationsQueryObject);

                let observation;
                let submissions;
                let entityObservationSubmissionStatus;

                for (let pointerToAssessorObservationArray = 0; pointerToAssessorObservationArray < userObservations.length; pointerToAssessorObservationArray++) {

                    observation = userObservations[pointerToAssessorObservationArray];

                    if(sourceApi == "v2") {

                        submissions = await database.models.observationSubmissions.find(
                            {
                                observationId: observation._id,
                                entityId: {
                                    $in: observation.entities
                                }
                            },
                            {
                                "themes": 0,
                                "criteria": 0,
                                "evidences": 0,
                                "answers": 0
                            }
                        ).sort( { createdAt: -1 } );

                    } else {

                        submissions = await database.models.observationSubmissions.find(
                            {
                                observationId: observation._id,
                                entityId: {
                                    $in: observation.entities
                                }
                            },
                            {
                                "themes": 0,
                                "criteria": 0,
                                "evidences": 0,
                                "answers": 0
                            }
                        );
                        
                    }

                    let observationEntitySubmissions = {};
                    submissions.forEach(observationEntitySubmission => {
                        if (!observationEntitySubmissions[observationEntitySubmission.entityId.toString()]) {
                            observationEntitySubmissions[observationEntitySubmission.entityId.toString()] = {
                                submissionStatus: "",
                                submissions: new Array,
                                entityId: observationEntitySubmission.entityId.toString()
                            };
                        }
                        observationEntitySubmissions[observationEntitySubmission.entityId.toString()].submissionStatus = observationEntitySubmission.status;
                        observationEntitySubmissions[observationEntitySubmission.entityId.toString()].submissions.push(observationEntitySubmission);
                    })

                    // entityObservationSubmissionStatus = submissions.reduce(
                    //     (ac, entitySubmission) => ({ ...ac, [entitySubmission.entityId.toString()]: {submissionStatus:(entitySubmission.entityId && entitySubmission.status) ? entitySubmission.status : "pending"} }), {})


                    observation.entities = new Array;
                    observation.entityDocuments.forEach(observationEntity => {
                        observation.entities.push({
                            _id: observationEntity._id,
                            submissionStatus: (observationEntitySubmissions[observationEntity._id.toString()]) ? observationEntitySubmissions[observationEntity._id.toString()].submissionStatus : "pending",
                            submissions: (observationEntitySubmissions[observationEntity._id.toString()]) ? observationEntitySubmissions[observationEntity._id.toString()].submissions : new Array,
                            ...observationEntity.metaInformation
                        });
                    })
                    observations.push(_.omit(observation, ["entityDocuments"]));
                }

                return resolve(observations);

            } catch (error) {
                return reject(error);
            }
        })
    }

     /**
   * find observation submission. 
   * @method
   * @name findSubmission
   * @param {Object} document
   * @param {Object} document.entityId - entity id.
   * @param {Object} document.solutionId - solution id.
   * @param {Object} document.observationId - observation id.
   * @param {Object} document.submissionNumber - submission number.     
   * @returns {Object} Submission document.
   */

    static findSubmission(document) {

        return new Promise(async (resolve, reject) => {

            try {

                let submissionDocument = await database.models.observationSubmissions.findOne(
                    {
                        entityId: document.entityId,
                        solutionId: document.solutionId,
                        observationId: document.observationId,
                        submissionNumber: document.submissionNumber
                    }
                ).lean();

                if (!submissionDocument) {

                    submissionDocument = await database.models.observationSubmissions.create(
                        document
                    );

                }

                return resolve({
                    message: messageConstants.apiResponses.FOUND_SUBMISSION,
                    result: submissionDocument
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    /**
   * find last submission for observation entity. 
   * @method
   * @name findLastSubmissionForObservationEntity
   * @param {String} [observationId = ""] - observation id.
   * @param {String} [entityId = ""] - entity id.       
   * @returns {Object} submissionNumber.
   */

    static findLastSubmissionForObservationEntity(observationId = "", entityId = "") {

        return new Promise(async (resolve, reject) => {

            try {

                if(observationId == "" || entityId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_OBSERVATION_ENTITY_ID);
                }

                if(typeof observationId == "string") {
                    observationId = ObjectId(observationId);
                }

                if(typeof entityId == "string") {
                    entityId = ObjectId(entityId);
                }

                let submissionDocument = await database.models.observationSubmissions.find(
                    {
                        observationId: observationId,
                        entityId : entityId
                    },{
                        submissionNumber : 1
                    }
                ).sort( { createdAt: -1 } ).limit(1).lean();

                return resolve({
                    success: true,
                    message: messageConstants.apiResponses.SUBMISSION_NUMBER_FETCHED,
                    result: (submissionDocument[0] && submissionDocument[0].submissionNumber) ? submissionDocument[0].submissionNumber : 0 
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    /**
   * Bulk create observation. 
   * @method
   * @name bulkCreate
   * @param {Object} solution - solution document.
   * @param {String} solution.externalId - solution external id.
   * @param {String} solution.frameworkId - framework id.
   * @param {String} solution.frameworkExternalId - framework external id.
   * @param {String} solution.name - solution name.   
   * @param {String} solution.description - solution description.  
   * @param {String} solution.type - solution type. 
   * @param {String} solution._id - solution id. 
   * @param {Object} entityDocument - entity document. 
   * @param {String} entityDocument._id - entity id.
   * @param {String} entityDocument.entityTypeId - entity type id.
   * @param {String} entityDocument.entityType - entity type.
   * @param {String} entityDocument.parentId - parent id.
   * @param {String} userId - logged in user id.      
   * @returns {Object} status.
   */

    static bulkCreate(solution, entityDocument, userId) {
        return new Promise(async (resolve, reject) => {
            try {

                let status

                let startDate = new Date()
                let endDate = new Date()
                endDate.setFullYear(endDate.getFullYear() + 1);

                let observationDocument = await database.models.observations.findOne({
                    solutionExternalId: solution.externalId,
                    createdBy: userId,
                    status: "published"
                }, { _id: 1 }).lean()

                if (observationDocument) {
                    let updateObservationData = await database.models.observations.findOneAndUpdate({ _id: observationDocument._id }, {
                        $addToSet: { entities: entityDocument._id }
                    }).lean();
                    updateObservationData ? status = `${updateObservationData._id.toString()} Updated Successfully` : status = `${updateObservationData._id.toString()} Could not be Updated`
                } else {

                    let observation = {}

                    observation["status"] = "published"
                    observation["deleted"] = "false"
                    observation["solutionId"] = solution._id
                    observation["solutionExternalId"] = solution.externalId
                    observation["frameworkId"] = solution.frameworkId
                    observation["frameworkExternalId"] = solution.frameworkExternalId
                    observation["entityTypeId"] = entityDocument.entityTypeId
                    observation["entityType"] = entityDocument.entityType
                    observation["parentId"] = entityDocument.parentId ? entityDocument.parentId : ""
                    observation["createdBy"] = userId
                    observation["startDate"] = startDate
                    observation["endDate"] = endDate
                    observation["name"] = solution.name
                    observation["description"] = solution.description
                    observation["entities"] = []
                    observation["entities"].push(entityDocument._id)

                    let observationDocument = await database.models.observations.create(
                        observation
                    );
                    observationDocument._id ? status = `${observationDocument._id} created` : status = `${observationDocument._id} could not be created`

                    if (observationDocument._id) {
                        await this.sendUserNotifications(userId, {
                            solutionType: solution.type,
                            solutionId: solution._id.toString(),
                            observationId: observationDocument._id.toString()
                        });
                    }
                }

                return resolve({
                    status: status
                })

            } catch (error) {
                return reject(error)
            }
        })
    }

    /**
   * Send user notifications. 
   * @method
   * @name sendUserNotifications
   * @param {Object} [observationData = {}] - .
   * @param {String} [userId = ""] - logged in user id.      
   * @returns {Object} message and success status.
   */

    static sendUserNotifications(userId = "", observationData = {}) {
        return new Promise(async (resolve, reject) => {
            try {

                if (userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID)
                }

                const kafkaMessage = await kafkaClient.pushEntityAssessorNotificationToKafka({
                    user_id: userId,
                    internal: false,
                    text: `New observation available now (Observation form)`,
                    type: "information",
                    action: "mapping",
                    payload: {
                        type: observationData.solutionType,
                        solution_id: observationData.solutionId,
                        observation_id: observationData.observationId
                    },
                    title: "New Observation",
                    created_at: new Date(),
                    appType: process.env.MOBILE_APPLICATION_APP_TYPE
                })

                if (kafkaMessage.status != "success") {
                    let errorObject = {
                        formData: {
                            userId: userId,
                            message: `Failed to push entity notification for observation ${observationData._id.toString()} in the solution ${observationData.solutionName}`
                        }
                    }
                    slackClient.kafkaErrorAlert(errorObject)
                    throw new Error(`Failed to push entity notification for observation ${observationData._id.toString()} in the solution ${observationData.solutionName}`);
                }

                return resolve({
                    success: true,
                    message: messageConstants.apiResponses.NOTIFICATION_PUSHED_TO_KAFKA
                })

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * Pending observation.
     * @method
     * @name pendingObservations  
     * @returns {Object} list of pending observation.
     */

    static pendingObservations() {
        return new Promise(async (resolve, reject) => {
            try {

                let findQuery = {
                    status : {
                        $ne: messageConstants.apiResponses.STATUS_COMPLETED
                    }
                };

                let observationSubmissionsDocuments = 
                await database.models.observationSubmissions.find(
                    findQuery, {
                    _id: 1
                }).lean();

                if ( observationSubmissionsDocuments.length < 0 ) {
                    throw {
                        message : 
                        messageConstants.apiResponses.NO_PENDING_OBSERVATION
                    }
                }

                let chunkOfObservationSubmissions = 
                _.chunk(observationSubmissionsDocuments, chunkOfObservationSubmissionsLength);

                let observationData = [];
                let observationSubmissionsIds;
                let observationSubmissionsDocument;

                for (
                    let pointerToObservationSubmission = 0; 
                    pointerToObservationSubmission < chunkOfObservationSubmissions.length; 
                    pointerToObservationSubmission++
                ) {

                    observationSubmissionsIds = chunkOfObservationSubmissions[pointerToObservationSubmission].map(observationSubmission => {
                        return observationSubmission._id;
                    })

                    observationSubmissionsDocument = 
                    await database.models.observationSubmissions.find({
                        _id: { $in: observationSubmissionsIds }
                    }, { _id: 1, 
                        solutionId: 1, 
                        createdAt: 1, 
                        entityId: 1, 
                        observationId: 1, 
                        createdBy: 1, 
                        "entityInformation.name": 1, 
                        "entityInformation.externalId": 1 
                    }).lean();

                    await Promise.all(observationSubmissionsDocument.map(async eachObservationData => {

                        let entityName = ""
                        if(eachObservationData.entityInformation && eachObservationData.entityInformation.name) {
                            entityName = eachObservationData.entityInformation.name;
                        } else if (eachObservationData.entityInformation && eachObservationData.entityInformation.externalId) {
                            entityName = eachObservationData.entityInformation.externalId;
                        }
                        
                        observationData.push({
                            _id: eachObservationData._id,
                            userId: eachObservationData.createdBy,
                            solutionId: eachObservationData.solutionId,
                            createdAt: eachObservationData.createdAt,
                            entityId: eachObservationData.entityId,
                            observationId: eachObservationData.observationId,
                            entityName: entityName
                        });

                    })
                    )
                }

                return resolve(observationData);

            }
            catch (error) {
                return reject(error);
            }
        })
    }


    /**
     * Completed observations.
     * @method
     * @name completedObservations
     * @param {String} fromDate  - from Date.
     * @param {String} toDate  - to Date.      
     * @returns {Object} list of completed observations.
     */

    static completedObservations(fromDate,toDate) {
        return new Promise(async (resolve, reject) => {
            try {

                let findQuery = {
                    status : messageConstants.apiResponses.STATUS_COMPLETED,
                    completedDate : {
                        $exists : true,
                        $gte : fromDate,
                        $lte : toDate
                    }
                };

                let observationDocuments = 
                await database.models.observationSubmissions.find(
                    findQuery, {
                    _id: 1
                }).lean();

                if ( !observationDocuments.length > 0 ) {
                    throw {
                        message : 
                        messageConstants.apiResponses.NO_COMPLETED_OBSERVATIONS
                    }
                }

                let chunkOfObservationSubmissions = 
                _.chunk(observationDocuments, chunkOfObservationSubmissionsLength);

                let observationData = [];
                let observationSubmissionsIds;
                let observationSubmissionsDocument;

                for (
                    let pointerToObservationSubmission = 0; 
                    pointerToObservationSubmission < chunkOfObservationSubmissions.length; 
                    pointerToObservationSubmission++
                ) {

                    observationSubmissionsIds = 
                    chunkOfObservationSubmissions[pointerToObservationSubmission].map(observationSubmission => {
                        return observationSubmission._id;
                    })

                    observationSubmissionsDocument = 
                    await database.models.observationSubmissions.find({
                        _id: { $in: observationSubmissionsIds }
                    }, { 
                        _id: 1, 
                        solutionId: 1,
                        entityId: 1, 
                        observationId: 1, 
                        "createdBy": 1, 
                        "entityInformation.name": 1, 
                        "entityInformation.externalId": 1,
                        "completedDate" : 1 
                    }).lean();
                    await Promise.all(
                        observationSubmissionsDocument.map(async eachObservationData => {

                        let entityName = ""
                        if(
                            eachObservationData.entityInformation && 
                            eachObservationData.entityInformation.name
                        ) {
                            entityName = 
                            eachObservationData.entityInformation.name;

                        } else if (
                            eachObservationData.entityInformation && 
                            eachObservationData.entityInformation.externalId
                        ) {
                            entityName = 
                            eachObservationData.entityInformation.externalId;

                        }
                        
                        observationData.push({
                            _id: eachObservationData._id,
                            userId: eachObservationData.createdBy,
                            solutionId: eachObservationData.solutionId,
                            entityId: eachObservationData.entityId,
                            observationId: eachObservationData.observationId,
                            entityName: entityName,
                            completedDate : eachObservationData.completedDate
                        });

                    })
                    )
                }

                return resolve(observationData);

            }
            catch (error) {
                return reject(error);
            }
        })
    }

     /**
      * observation details.
      * @method
      * @name details
      * @param  {String} observationId observation id.
      * @returns {details} observation details.
     */

    static details(observationId) {
        return new Promise(async (resolve, reject) => {
            try {

                let observationDocument = await this.observationDocuments({
                    _id:observationId
                });

                if(!observationDocument[0]) {
                    throw new Error(messageConstants.apiResponses.OBSERVATION_NOT_FOUND);
                }

                if(observationDocument[0].entities.length>0) {

                    let entitiesDocument = await entitiesHelper.entityDocuments({
                        _id:{$in:observationDocument[0].entities}
                    });

                    observationDocument[0]["count"] = entitiesDocument.length;
                    observationDocument[0].entities = entitiesDocument;
                }

                return resolve(observationDocument[0]);

            }
            catch (error) {
                return reject(error);
            }
        })
    }

     /**
      *  Helper function for list of fields to be selected from solution document.
      * @method
      * @name solutionDocumentProjectionFieldsForDetailsAPI
      * @returns {Promise} Returns a Promise.
     */

    static solutionDocumentProjectionFieldsForDetailsAPI() {
        
        return new Promise(async (resolve, reject) => {
            return resolve({
                name: 1,
                externalId: 1,
                description: 1,
                themes: 1,
                entityProfileFieldsPerEntityTypes: 1,
                registry: 1,
                questionSequenceByEcm: 1,
                frameworkId: 1,
                frameworkExternalId: 1,
                roles: 1,
                evidenceMethods: 1,
                sections: 1,
                entityTypeId: 1,
                entityType: 1,
                captureGpsLocationAtQuestionLevel : 1,
                enableQuestionReadOut : 1
            });
        })
    }

     /**
      *  Helper function for list of solution fields to be sent in response.
      * @method
      * @name solutionDocumentFieldListInResponse
      * @returns {Promise} Returns a Promise.
     */

    static solutionDocumentFieldListInResponse() {

        return new Promise(async (resolve, reject) => {
            return resolve([
                "_id",
                "externalId",
                "name",
                "description",
                "registry",
                "captureGpsLocationAtQuestionLevel",
                "enableQuestionReadOut"
            ]);
        })
    }

};