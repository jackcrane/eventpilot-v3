import { useParams } from "react-router-dom";
import { useLocation } from "../../hooks/useLocation";
import { useOffcanvas, Typography, Table, Button } from "tabler-react-2";
import React, { useEffect, useState } from "react";
import { Empty } from "../empty/Empty";
import { JobCRUD } from "../job/jobCRUD";
import { Icon } from "../../util/Icon";
import { useJobs } from "../../hooks/useJobs";
import { Loading } from "../loading/Loading";

const RESTRICTIONS_MAP = {
  OVER_18: "Must be over 18",
  OVER_21: "Must be over 21",
  SPECIAL_CERT_REQUIRED: "Special certification required",
  PHYSICAL_ABILITY: "Must be physically able-bodied",
  OTHER: "Other",
};

export const EventLocationJobListing = ({ locationId }) => {
  const { eventId } = useParams();
  const { location, loading } = useLocation({ eventId, locationId });
  const {
    jobs,
    deleteJob,
    loading: jobsLoading,
  } = useJobs({ eventId, locationId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500 },
  });

  if (loading) return null;

  return (
    <div className="mb-4" key={location.id}>
      {OffcanvasElement}
      <Typography.H6 className="text-muted mb-0">LOCATION</Typography.H6>
      <Typography.H2 className="mt-0 mb-0">{location.name}</Typography.H2>
      <Typography.H5 className="text-muted">
        {location.address}, {location.city}, {location.state}
      </Typography.H5>
      {jobsLoading ? (
        <Loading />
      ) : jobs?.length === 0 ? (
        <Empty
          onCtaClick={() =>
            offcanvas({
              content: (
                <JobCRUD defaultLocation={location.id} onFinish={close} />
              ),
            })
          }
        />
      ) : (
        // JSON.stringify(jobs)
        <Table
          columns={[
            {
              label: "Name",
              accessor: "name",
            },
            {
              label: "Capacity",
              accessor: "capacity",
              render: (c) => (c === 0 ? "Unlimited" : c),
            },
            {
              label: "Restrictions",
              accessor: "restrictions",
              render: (r) => r.map((i) => RESTRICTIONS_MAP[i]).join(", "),
            },
            {
              label: "Delete",
              accessor: "id",
              render: (id, row) => (
                <Button
                  size="sm"
                  onClick={() => deleteJob(id)}
                  variant="danger"
                  outline
                >
                  <Icon i="trash" />
                  Delete
                </Button>
              ),
            },
            {
              label: "Details & Edit",
              accessor: "id",
              render: (id, row) => (
                <Button
                  size="sm"
                  onClick={() =>
                    offcanvas({
                      content: (
                        <JobCRUD
                          value={row}
                          defaultLocation={location.id}
                          onFinish={close}
                        />
                      ),
                    })
                  }
                >
                  <Icon i="info-circle" />
                  Details
                </Button>
              ),
            },
          ]}
          data={jobs}
        />
      )}
    </div>
  );
};
